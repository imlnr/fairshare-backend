"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.billService = void 0;
const api_error_1 = require("../../utils/api-error");
const split_math_1 = require("../../utils/split-math");
const bill_model_1 = require("../../modules/bills/bill.model");
const expense_model_1 = require("../../modules/expenses/expense.model");
const payment_model_1 = require("../../modules/payments/payment.model");
const room_model_1 = require("../../modules/rooms/room.model");
const room_member_model_1 = require("../../modules/rooms/room-member.model");
const user_model_1 = require("../../modules/users/user.model");
const bill_calculator_1 = require("../../modules/bills/bill-calculator");
const roles_1 = require("../../constants/roles");
async function resolveActiveMembersForBill(roomId, expenses) {
    const ids = new Set();
    for (const expense of expenses) {
        for (const id of expense.presentMemberIds) {
            ids.add(String(id));
        }
        if (expense.paidByUserId) {
            ids.add(String(expense.paidByUserId));
        }
    }
    const memberships = await room_member_model_1.RoomMember.find({ roomId, isActive: true }).lean();
    for (const membership of memberships) {
        ids.add(membership.userId.toString());
    }
    const room = await room_model_1.Room.findById(roomId).lean();
    if (room?.managerId) {
        ids.add(room.managerId.toString());
    }
    const users = await user_model_1.User.find({ _id: { $in: [...ids] } })
        .select("name")
        .lean();
    return users.map((user) => ({
        userId: user._id.toString(),
        name: user.name,
    }));
}
function transfersFromSummaries(summaries) {
    return (0, split_math_1.computeSettlementTransfers)(summaries.map((s) => ({
        userId: String(s.userId),
        finalAmount: s.finalAmount,
    })));
}
exports.billService = {
    async listBills(roomId) {
        const bills = await bill_model_1.Bill.find({ roomId }).sort({ period: -1 });
        for (const bill of bills) {
            if (!bill.settlementTransfers || bill.settlementTransfers.length === 0) {
                const transfers = transfersFromSummaries(bill.memberSummaries);
                if (transfers.length > 0 || bill.memberSummaries.length > 0) {
                    bill.set("settlementTransfers", transfers);
                    await bill.save();
                }
            }
        }
        return bills.map((bill) => bill.toObject());
    },
    async getBill(billId, user) {
        const bill = await bill_model_1.Bill.findById(billId);
        if (!bill)
            throw new api_error_1.ApiError(404, "Bill not found");
        if (!bill.settlementTransfers || bill.settlementTransfers.length === 0) {
            bill.set("settlementTransfers", transfersFromSummaries(bill.memberSummaries));
            await bill.save();
        }
        const lean = bill.toObject();
        if (user.role.key !== roles_1.ROLE_KEYS.ADMIN &&
            user.role.key !== roles_1.ROLE_KEYS.ROOM_MANAGER) {
            const ownSummary = lean.memberSummaries.find((s) => s.userId.toString() === user.id);
            const ownTransfers = lean.settlementTransfers.filter((t) => t.fromUserId.toString() === user.id || t.toUserId.toString() === user.id);
            return {
                ...lean,
                memberSummaries: ownSummary ? [ownSummary] : [],
                settlementTransfers: ownTransfers,
            };
        }
        return lean;
    },
    async generateBill(roomId, period, generatedById) {
        if (!/^\d{4}-\d{2}$/.test(period)) {
            throw new api_error_1.ApiError(400, "Period must be in YYYY-MM format");
        }
        const existingBill = await bill_model_1.Bill.findOne({ roomId, period });
        if (existingBill?.status === "locked") {
            throw new api_error_1.ApiError(409, `A locked bill already exists for ${period} (version ${existingBill.version}). Reopen it to regenerate.`);
        }
        const expenses = await expense_model_1.Expense.find({ roomId, billPeriod: period });
        if (expenses.length === 0) {
            throw new api_error_1.ApiError(400, `No expenses found for period ${period}`);
        }
        // Ensure every expense has persisted shares before bill math
        for (const expense of expenses) {
            if (!expense.memberShares || expense.memberShares.length === 0) {
                expense.set("memberShares", (0, split_math_1.computeEqualShares)(expense.amount, expense.presentMemberIds.map((id) => id.toString())));
                await expense.save();
            }
        }
        const leanExpenses = expenses.map((e) => e.toObject());
        const activeMembers = await resolveActiveMembersForBill(roomId, leanExpenses);
        if (activeMembers.length === 0) {
            throw new api_error_1.ApiError(400, "No participants found for this bill period");
        }
        const [prevYear, prevMonth] = period.split("-").map(Number);
        const prevDate = new Date(prevYear, prevMonth - 2, 1);
        const prevPeriod = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, "0")}`;
        const previousBill = await bill_model_1.Bill.findOne({
            roomId,
            period: prevPeriod,
            status: "locked",
        }).lean();
        const previousBillSummaries = (previousBill?.memberSummaries ?? []).map((s) => ({
            userId: s.userId.toString(),
            finalAmount: s.finalAmount,
        }));
        const paymentsThisPeriod = existingBill
            ? await payment_model_1.Payment.find({ billId: existingBill._id }).lean()
            : [];
        const paymentsSummary = paymentsThisPeriod.map((p) => ({
            payerId: p.payerId.toString(),
            amount: p.amount,
        }));
        const { memberSummaries } = (0, bill_calculator_1.calculateBill)({
            expenses: leanExpenses,
            activeMembers,
            previousBillSummaries,
            paymentsThisPeriod: paymentsSummary,
        });
        const settlementTransfers = transfersFromSummaries(memberSummaries);
        const expenseIds = leanExpenses.map((e) => e._id);
        if (existingBill) {
            await bill_model_1.Bill.findByIdAndUpdate(existingBill._id, {
                $set: {
                    memberSummaries,
                    settlementTransfers,
                    lockedExpenseIds: expenseIds,
                    status: "locked",
                    generatedAt: new Date(),
                    generatedBy: generatedById,
                    version: (existingBill.version ?? 1) + 1,
                },
            });
        }
        else {
            await bill_model_1.Bill.create({
                roomId,
                period,
                version: 1,
                status: "locked",
                generatedAt: new Date(),
                generatedBy: generatedById,
                memberSummaries,
                settlementTransfers,
                lockedExpenseIds: expenseIds,
            });
        }
        await expense_model_1.Expense.updateMany({ _id: { $in: expenseIds } }, { $set: { isLocked: true } });
        return bill_model_1.Bill.findOne({ roomId, period }).lean();
    },
    async reopenBill(billId) {
        const bill = await bill_model_1.Bill.findById(billId);
        if (!bill)
            throw new api_error_1.ApiError(404, "Bill not found");
        if (bill.status !== "locked") {
            throw new api_error_1.ApiError(400, "Only locked bills can be reopened");
        }
        await expense_model_1.Expense.updateMany({ _id: { $in: bill.lockedExpenseIds } }, { $set: { isLocked: false } });
        bill.status = "draft";
        bill.version = (bill.version ?? 1) + 1;
        return bill.save();
    },
};

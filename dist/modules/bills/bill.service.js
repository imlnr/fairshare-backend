"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.billService = void 0;
const api_error_1 = require("../../utils/api-error");
const bill_model_1 = require("../../modules/bills/bill.model");
const expense_model_1 = require("../../modules/expenses/expense.model");
const payment_model_1 = require("../../modules/payments/payment.model");
const room_member_model_1 = require("../../modules/rooms/room-member.model");
const bill_calculator_1 = require("../../modules/bills/bill-calculator");
const roles_1 = require("../../constants/roles");
exports.billService = {
    async listBills(roomId) {
        return bill_model_1.Bill.find({ roomId }).sort({ period: -1 }).lean();
    },
    async getBill(billId, user) {
        const bill = await bill_model_1.Bill.findById(billId).lean();
        if (!bill)
            throw new api_error_1.ApiError(404, "Bill not found");
        // Members only see their own summary
        if (user.role.key !== roles_1.ROLE_KEYS.ADMIN &&
            user.role.key !== roles_1.ROLE_KEYS.ROOM_MANAGER) {
            const ownSummary = bill.memberSummaries.find((s) => s.userId.toString() === user.id);
            return { ...bill, memberSummaries: ownSummary ? [ownSummary] : [] };
        }
        return bill;
    },
    async generateBill(roomId, period, generatedById) {
        // Validate period format
        if (!/^\d{4}-\d{2}$/.test(period)) {
            throw new api_error_1.ApiError(400, "Period must be in YYYY-MM format");
        }
        // Check for existing locked bill
        const existingBill = await bill_model_1.Bill.findOne({ roomId, period });
        if (existingBill?.status === "locked") {
            throw new api_error_1.ApiError(409, `A locked bill already exists for ${period} (version ${existingBill.version}). Reopen it to regenerate.`);
        }
        // Fetch expenses for this period
        const expenses = await expense_model_1.Expense.find({ roomId, billPeriod: period }).lean();
        if (expenses.length === 0) {
            throw new api_error_1.ApiError(400, `No expenses found for period ${period}`);
        }
        // Active members at time of generation
        const memberships = await room_member_model_1.RoomMember.find({ roomId, isActive: true })
            .populate("userId", "name email")
            .lean();
        if (memberships.length === 0) {
            throw new api_error_1.ApiError(400, "No active members in this room");
        }
        const activeMembers = memberships.map((m) => {
            const u = m.userId;
            return { userId: u._id.toString(), name: u.name };
        });
        // Get previous bill to carry forward pending amounts
        const [prevYear, prevMonth] = period.split("-").map(Number);
        const prevDate = new Date(prevYear, prevMonth - 2, 1);
        const prevPeriod = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, "0")}`;
        const previousBill = await bill_model_1.Bill.findOne({ roomId, period: prevPeriod, status: "locked" }).lean();
        const previousBillSummaries = (previousBill?.memberSummaries ?? []).map((s) => ({
            userId: s.userId.toString(),
            finalAmount: s.finalAmount,
        }));
        // Get payments recorded for this period's bill (if draft exists)
        const existingBillForPayments = existingBill;
        const paymentsThisPeriod = existingBillForPayments
            ? await payment_model_1.Payment.find({ billId: existingBillForPayments._id }).lean()
            : [];
        const paymentsSummary = paymentsThisPeriod.map((p) => ({
            payerId: p.payerId.toString(),
            amount: p.amount,
        }));
        const { memberSummaries } = (0, bill_calculator_1.calculateBill)({
            expenses: expenses,
            activeMembers,
            previousBillSummaries,
            paymentsThisPeriod: paymentsSummary,
        });
        const expenseIds = expenses.map((e) => e._id);
        if (existingBill) {
            // Regenerate: update existing draft
            await bill_model_1.Bill.findByIdAndUpdate(existingBill._id, {
                $set: {
                    memberSummaries,
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
                lockedExpenseIds: expenseIds,
            });
        }
        const bill = await bill_model_1.Bill.findOne({ roomId, period });
        // Lock all included expenses
        await expense_model_1.Expense.updateMany({ _id: { $in: expenseIds } }, { $set: { isLocked: true } });
        return bill;
    },
    async reopenBill(billId) {
        const bill = await bill_model_1.Bill.findById(billId);
        if (!bill)
            throw new api_error_1.ApiError(404, "Bill not found");
        if (bill.status !== "locked") {
            throw new api_error_1.ApiError(400, "Only locked bills can be reopened");
        }
        // Unlock associated expenses
        await expense_model_1.Expense.updateMany({ _id: { $in: bill.lockedExpenseIds } }, { $set: { isLocked: false } });
        bill.status = "draft";
        bill.version = (bill.version ?? 1) + 1;
        return bill.save();
    },
};

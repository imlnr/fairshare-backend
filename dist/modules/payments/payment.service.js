"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.paymentService = void 0;
const api_error_1 = require("../../utils/api-error");
const split_math_1 = require("../../utils/split-math");
const payment_model_1 = require("../../modules/payments/payment.model");
const bill_model_1 = require("../../modules/bills/bill.model");
exports.paymentService = {
    async listPayments(billId) {
        return payment_model_1.Payment.find({ billId }).populate("payerId", "name email image").lean();
    },
    async recordPayment(billId, roomId, input, recordedById) {
        const bill = await bill_model_1.Bill.findById(billId);
        if (!bill)
            throw new api_error_1.ApiError(404, "Bill not found");
        const summary = bill.memberSummaries.find((s) => s.userId.toString() === input.payerId);
        if (!summary) {
            throw new api_error_1.ApiError(400, "This user does not have a summary in the specified bill");
        }
        const payment = await payment_model_1.Payment.create({
            billId,
            roomId,
            payerId: input.payerId,
            amount: input.amount,
            recordedBy: recordedById,
            notes: input.notes,
            paidAt: input.paidAt ?? new Date(),
        });
        const allPayments = await payment_model_1.Payment.find({ billId }).lean();
        const paidByUser = new Map();
        for (const row of allPayments) {
            const key = row.payerId.toString();
            paidByUser.set(key, (0, split_math_1.round2)((paidByUser.get(key) ?? 0) + row.amount));
        }
        for (const member of bill.memberSummaries) {
            const userId = member.userId.toString();
            const paymentsReceived = paidByUser.get(userId) ?? 0;
            const netBeforePayments = (0, split_math_1.round2)(member.currentShare - member.netPaidFor + member.previousPending);
            const finalAmount = (0, split_math_1.round2)(netBeforePayments - paymentsReceived);
            member.paymentsReceived = paymentsReceived;
            member.finalAmount = finalAmount;
            member.settlementStatus = (0, split_math_1.settlementStatusFor)(finalAmount, paymentsReceived);
        }
        bill.set("settlementTransfers", (0, split_math_1.computeSettlementTransfers)(bill.memberSummaries.map((s) => ({
            userId: s.userId.toString(),
            finalAmount: s.finalAmount,
        }))));
        await bill.save();
        return payment;
    },
};

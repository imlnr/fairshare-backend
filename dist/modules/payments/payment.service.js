"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.paymentService = void 0;
const api_error_1 = require("../../utils/api-error");
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
        // Find the member's summary
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
        // Recalculate settlement status for this member
        const allPayments = await payment_model_1.Payment.find({ billId, payerId: input.payerId });
        const totalPaid = allPayments.reduce((sum, p) => sum + p.amount, 0);
        const newFinal = summary.finalAmount - totalPaid;
        let settlementStatus;
        if (newFinal <= 0) {
            settlementStatus = "settled";
        }
        else if (totalPaid > 0) {
            settlementStatus = "partial";
        }
        else {
            settlementStatus = "pending";
        }
        await bill_model_1.Bill.updateOne({ _id: billId, "memberSummaries.userId": input.payerId }, {
            $set: {
                "memberSummaries.$.paymentsReceived": totalPaid,
                "memberSummaries.$.settlementStatus": settlementStatus,
            },
        });
        return payment;
    },
};

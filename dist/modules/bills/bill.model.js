"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Bill = exports.SETTLEMENT_STATUSES = exports.BILL_STATUSES = void 0;
const mongoose_1 = require("mongoose");
exports.BILL_STATUSES = ["draft", "locked"];
exports.SETTLEMENT_STATUSES = ["pending", "partial", "settled"];
const memberSummarySchema = new mongoose_1.Schema({
    userId: { type: mongoose_1.Types.ObjectId, ref: "User", required: true },
    currentShare: { type: Number, required: true, default: 0 },
    previousPending: { type: Number, required: true, default: 0 },
    paymentsReceived: { type: Number, required: true, default: 0 },
    netPaidFor: { type: Number, required: true, default: 0 },
    finalAmount: { type: Number, required: true, default: 0 },
    settlementStatus: {
        type: String,
        enum: exports.SETTLEMENT_STATUSES,
        default: "pending",
    },
}, { _id: false });
const settlementTransferSchema = new mongoose_1.Schema({
    fromUserId: { type: mongoose_1.Types.ObjectId, ref: "User", required: true },
    toUserId: { type: mongoose_1.Types.ObjectId, ref: "User", required: true },
    amount: { type: Number, required: true, min: 0.01 },
}, { _id: false });
const billSchema = new mongoose_1.Schema({
    roomId: {
        type: mongoose_1.Types.ObjectId,
        ref: "Room",
        required: true,
        index: true,
    },
    period: {
        type: String,
        required: true,
        match: /^\d{4}-\d{2}$/,
    },
    version: {
        type: Number,
        default: 1,
    },
    status: {
        type: String,
        enum: exports.BILL_STATUSES,
        default: "draft",
    },
    generatedAt: {
        type: Date,
    },
    generatedBy: {
        type: mongoose_1.Types.ObjectId,
        ref: "User",
    },
    memberSummaries: {
        type: [memberSummarySchema],
        default: [],
    },
    /** Backend-computed who-pays-whom plan from finalAmounts */
    settlementTransfers: {
        type: [settlementTransferSchema],
        default: [],
    },
    lockedExpenseIds: {
        type: [mongoose_1.Types.ObjectId],
        default: [],
    },
}, {
    timestamps: true,
    versionKey: false,
});
billSchema.index({ roomId: 1, period: 1 });
exports.Bill = (0, mongoose_1.model)("Bill", billSchema);

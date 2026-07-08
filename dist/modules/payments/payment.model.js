"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Payment = void 0;
const mongoose_1 = require("mongoose");
const paymentSchema = new mongoose_1.Schema({
    billId: {
        type: mongoose_1.Types.ObjectId,
        ref: "Bill",
        required: true,
        index: true,
    },
    roomId: {
        type: mongoose_1.Types.ObjectId,
        ref: "Room",
        required: true,
        index: true,
    },
    payerId: {
        type: mongoose_1.Types.ObjectId,
        ref: "User",
        required: true,
    },
    amount: {
        type: Number,
        required: true,
        min: 0.01,
    },
    recordedBy: {
        type: mongoose_1.Types.ObjectId,
        ref: "User",
        required: true,
    },
    notes: {
        type: String,
        trim: true,
    },
    paidAt: {
        type: Date,
        default: Date.now,
    },
}, {
    timestamps: true,
    versionKey: false,
});
exports.Payment = (0, mongoose_1.model)("Payment", paymentSchema);

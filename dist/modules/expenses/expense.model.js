"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Expense = void 0;
const mongoose_1 = require("mongoose");
const memberShareSchema = new mongoose_1.Schema({
    userId: {
        type: mongoose_1.Types.ObjectId,
        ref: "User",
        required: true,
    },
    share: {
        type: Number,
        required: true,
        min: 0,
    },
}, { _id: false });
const expenseSchema = new mongoose_1.Schema({
    roomId: {
        type: mongoose_1.Types.ObjectId,
        ref: "Room",
        required: true,
        index: true,
    },
    title: {
        type: String,
        required: true,
        trim: true,
    },
    amount: {
        type: Number,
        required: true,
        min: 0.01,
    },
    description: {
        type: String,
        trim: true,
    },
    date: {
        type: Date,
        required: true,
    },
    paidByUserId: {
        type: mongoose_1.Types.ObjectId,
        ref: "User",
        default: null,
    },
    presentMemberIds: {
        type: [mongoose_1.Types.ObjectId],
        required: true,
        validate: {
            validator: (arr) => arr.length >= 1,
            message: "At least one member must be present for an expense",
        },
    },
    /** Backend-computed equal split for each present member */
    memberShares: {
        type: [memberShareSchema],
        default: [],
    },
    billPeriod: {
        type: String,
        required: true,
        match: /^\d{4}-\d{2}$/,
    },
    isLocked: {
        type: Boolean,
        default: false,
        index: true,
    },
    createdBy: {
        type: mongoose_1.Types.ObjectId,
        ref: "User",
        required: true,
    },
}, {
    timestamps: true,
    versionKey: false,
});
expenseSchema.index({ roomId: 1, billPeriod: 1 });
exports.Expense = (0, mongoose_1.model)("Expense", expenseSchema);

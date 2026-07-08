"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RoomManagerRequest = exports.JOIN_REQUEST_STATUSES = void 0;
const mongoose_1 = require("mongoose");
exports.JOIN_REQUEST_STATUSES = ["pending", "approved", "rejected"];
const roomManagerRequestSchema = new mongoose_1.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
    },
    email: {
        type: String,
        required: true,
        lowercase: true,
        trim: true,
        index: true,
    },
    phone: {
        type: String,
        trim: true,
    },
    organization: {
        type: String,
        trim: true,
    },
    message: {
        type: String,
        required: true,
        trim: true,
    },
    status: {
        type: String,
        enum: exports.JOIN_REQUEST_STATUSES,
        default: "pending",
        index: true,
    },
    reviewedBy: {
        type: mongoose_1.Types.ObjectId,
        ref: "User",
    },
    reviewedAt: {
        type: Date,
    },
    adminNotes: {
        type: String,
        trim: true,
    },
    createdUserId: {
        type: mongoose_1.Types.ObjectId,
        ref: "User",
    },
}, {
    timestamps: true,
    versionKey: false,
});
exports.RoomManagerRequest = (0, mongoose_1.model)("RoomManagerRequest", roomManagerRequestSchema);

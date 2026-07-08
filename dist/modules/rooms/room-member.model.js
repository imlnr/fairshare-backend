"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RoomMember = void 0;
const mongoose_1 = require("mongoose");
const roomMemberSchema = new mongoose_1.Schema({
    roomId: {
        type: mongoose_1.Types.ObjectId,
        ref: "Room",
        required: true,
        index: true,
    },
    userId: {
        type: mongoose_1.Types.ObjectId,
        ref: "User",
        required: true,
        index: true,
    },
    joinedAt: {
        type: Date,
        default: Date.now,
    },
    leftAt: {
        type: Date,
        default: null,
    },
    isActive: {
        type: Boolean,
        default: true,
    },
}, {
    timestamps: true,
    versionKey: false,
});
roomMemberSchema.index({ roomId: 1, userId: 1 }, { unique: true });
exports.RoomMember = (0, mongoose_1.model)("RoomMember", roomMemberSchema);

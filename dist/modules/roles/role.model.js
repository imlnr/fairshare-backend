"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Role = void 0;
const mongoose_1 = require("mongoose");
const roles_1 = require("../../constants/roles");
const roleSchema = new mongoose_1.Schema({
    key: {
        type: String,
        enum: Object.values(roles_1.ROLE_KEYS),
        required: true,
        unique: true,
        trim: true,
    },
    name: {
        type: String,
        required: true,
        trim: true,
    },
    description: {
        type: String,
        trim: true,
    },
    isSystem: {
        type: Boolean,
        default: true,
    },
}, {
    timestamps: true,
    versionKey: false,
});
exports.Role = (0, mongoose_1.model)("Role", roleSchema);

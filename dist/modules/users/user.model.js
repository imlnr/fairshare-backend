"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.User = exports.AUTH_PROVIDERS = void 0;
const mongoose_1 = require("mongoose");
exports.AUTH_PROVIDERS = ["local", "google", "both"];
const userSchema = new mongoose_1.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
    },
    password: {
        type: String,
        select: false,
        minlength: 8,
    },
    image: {
        type: String,
        trim: true,
    },
    googleId: {
        type: String,
        unique: true,
        sparse: true,
        trim: true,
    },
    googleEmail: {
        type: String,
        lowercase: true,
        trim: true,
    },
    authProvider: {
        type: String,
        enum: exports.AUTH_PROVIDERS,
        default: "local",
    },
    roleId: {
        type: mongoose_1.Types.ObjectId,
        ref: "Role",
        required: true,
        index: true,
    },
    isActive: {
        type: Boolean,
        default: true,
    },
    isEmailVerified: {
        type: Boolean,
        default: false,
    },
    lastLoginAt: {
        type: Date,
    },
}, {
    timestamps: true,
    versionKey: false,
});
exports.User = (0, mongoose_1.model)("User", userSchema);

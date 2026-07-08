"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailTemplate = void 0;
const mongoose_1 = require("mongoose");
const emailTemplateSchema = new mongoose_1.Schema({
    key: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        index: true,
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
    subject: {
        type: String,
        required: true,
    },
    htmlBody: {
        type: String,
        required: true,
    },
    textBody: {
        type: String,
        required: true,
    },
    variables: {
        type: [String],
        default: [],
    },
    isActive: {
        type: Boolean,
        default: true,
    },
}, {
    timestamps: true,
    versionKey: false,
    collection: "emailTemplates",
});
exports.EmailTemplate = (0, mongoose_1.model)("EmailTemplate", emailTemplateSchema);

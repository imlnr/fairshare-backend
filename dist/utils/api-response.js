"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendSuccess = sendSuccess;
exports.sendError = sendError;
function sendSuccess(data, message = "Success") {
    return { success: true, message, data };
}
function sendError(message, errors) {
    return { success: false, message, errors };
}

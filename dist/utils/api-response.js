"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiResponse = void 0;
exports.sendSuccess = sendSuccess;
exports.sendError = sendError;
function sendSuccess(data, message = "Success") {
    return { success: true, message, data };
}
function sendError(message, errors) {
    return { success: false, message, errors };
}
exports.ApiResponse = {
    success: (data, message = "Success") => sendSuccess(data, message),
    error: (message, errors) => sendError(message, errors),
};

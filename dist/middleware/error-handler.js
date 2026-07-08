"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notFoundHandler = notFoundHandler;
exports.errorHandler = errorHandler;
const api_error_1 = require("@/utils/api-error");
const api_response_1 = require("@/utils/api-response");
const env_1 = require("@/config/env");
const logger_1 = require("@/utils/logger");
function notFoundHandler(req, res) {
    res.status(404).json((0, api_response_1.sendError)(`Route not found: ${req.method} ${req.originalUrl}`));
}
function errorHandler(err, _req, res) {
    if (err instanceof api_error_1.ApiError) {
        res.status(err.statusCode).json((0, api_response_1.sendError)(err.message));
        return;
    }
    logger_1.logger.error("Unhandled error", {
        error: err instanceof Error ? err.message : err,
    });
    res.status(500).json((0, api_response_1.sendError)(env_1.env.isProduction
        ? "Internal server error"
        : err instanceof Error
            ? err.message
            : "Unknown error"));
}

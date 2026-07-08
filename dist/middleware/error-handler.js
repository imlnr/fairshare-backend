"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notFoundHandler = notFoundHandler;
exports.errorHandler = errorHandler;
const api_error_1 = require("../utils/api-error");
const api_response_1 = require("../utils/api-response");
const env_1 = require("../config/env");
const logger_1 = require("../utils/logger");
function getRequestMeta(req) {
    return {
        method: req.method,
        url: req.originalUrl,
        path: req.path,
        ip: req.ip,
        userId: req.user?.id,
        role: req.user?.role.key,
    };
}
function notFoundHandler(req, res) {
    logger_1.logger.warn("Route not found", getRequestMeta(req));
    res.status(404).json((0, api_response_1.sendError)(`Route not found: ${req.method} ${req.originalUrl}`));
}
function errorHandler(err, req, res, _next) {
    const requestMeta = getRequestMeta(req);
    if (err instanceof api_error_1.ApiError) {
        const level = err.statusCode >= 500 ? "error" : "warn";
        logger_1.logger[level](err.message, {
            ...requestMeta,
            statusCode: err.statusCode,
            type: "ApiError",
        });
        res.status(err.statusCode).json((0, api_response_1.sendError)(err.message));
        return;
    }
    logger_1.logger.error("Unhandled error", {
        ...requestMeta,
        statusCode: 500,
        type: err instanceof Error ? err.name : "UnknownError",
        error: err instanceof Error ? err.message : err,
        stack: err instanceof Error ? err.stack : undefined,
    });
    res.status(500).json((0, api_response_1.sendError)(env_1.env.isProduction
        ? "Internal server error"
        : err instanceof Error
            ? err.message
            : "Unknown error"));
}

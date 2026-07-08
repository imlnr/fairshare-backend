"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestLogger = requestLogger;
const logger_1 = require("../utils/logger");
const env_1 = require("../config/env");
const SENSITIVE_KEYS = new Set([
    "password",
    "token",
    "accessToken",
    "refreshToken",
    "authorization",
    "smtpPass",
    "jwtSecret",
]);
function redactValue(value) {
    if (Array.isArray(value)) {
        return value.map(redactValue);
    }
    if (value && typeof value === "object") {
        return Object.fromEntries(Object.entries(value).map(([key, nested]) => [
            key,
            SENSITIVE_KEYS.has(key.toLowerCase()) ? "[REDACTED]" : redactValue(nested),
        ]));
    }
    return value;
}
function getRequestMeta(req) {
    const meta = {
        method: req.method,
        url: req.originalUrl,
        path: req.path,
        ip: req.ip,
        userAgent: req.get("user-agent") ?? undefined,
        userId: req.user?.id,
        role: req.user?.role.key,
    };
    if (env_1.env.logLevel === "debug" && req.body && typeof req.body === "object") {
        const bodyKeys = Object.keys(req.body);
        if (bodyKeys.length > 0) {
            meta.body = redactValue(req.body);
        }
    }
    if (env_1.env.logLevel === "debug" && Object.keys(req.query).length > 0) {
        meta.query = req.query;
    }
    return meta;
}
function logLevelForStatus(statusCode) {
    if (statusCode >= 500)
        return "error";
    if (statusCode >= 400)
        return "warn";
    return "info";
}
function requestLogger(req, res, next) {
    const startedAt = process.hrtime.bigint();
    res.on("finish", () => {
        const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
        const statusCode = res.statusCode;
        const level = logLevelForStatus(statusCode);
        const contentLength = res.getHeader("content-length");
        logger_1.logger[level]("HTTP request completed", {
            ...getRequestMeta(req),
            statusCode,
            durationMs: Math.round(durationMs * 100) / 100,
            contentLength: contentLength ?? undefined,
        });
    });
    res.on("close", () => {
        if (!res.writableEnded) {
            const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
            logger_1.logger.warn("HTTP request closed before response finished", {
                ...getRequestMeta(req),
                statusCode: res.statusCode || undefined,
                durationMs: Math.round(durationMs * 100) / 100,
            });
        }
    });
    next();
}

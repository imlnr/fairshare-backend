"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.healthController = void 0;
const async_handler_1 = require("@/middleware/async-handler");
const api_response_1 = require("@/utils/api-response");
exports.healthController = {
    getHealth: (0, async_handler_1.asyncHandler)(async (_req, res) => {
        res.json((0, api_response_1.sendSuccess)({
            status: "ok",
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
        }, "Service is healthy"));
    }),
};

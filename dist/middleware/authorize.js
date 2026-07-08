"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authorize = exports.authenticate = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_1 = require("@/config/env");
const api_error_1 = require("@/utils/api-error");
const async_handler_1 = require("@/middleware/async-handler");
const auth_service_1 = require("@/modules/auth/auth.service");
exports.authenticate = (0, async_handler_1.asyncHandler)(async (req, _res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
        throw new api_error_1.ApiError(401, "Authentication required");
    }
    const token = authHeader.slice(7);
    try {
        const payload = jsonwebtoken_1.default.verify(token, env_1.env.jwtSecret);
        req.user = await auth_service_1.authService.getAuthContext(payload.sub);
        next();
    }
    catch {
        throw new api_error_1.ApiError(401, "Invalid or expired token");
    }
});
const authorize = (...requiredPermissions) => (0, async_handler_1.asyncHandler)(async (req, _res, next) => {
    if (!req.user) {
        throw new api_error_1.ApiError(401, "Authentication required");
    }
    const hasAllPermissions = requiredPermissions.every((permission) => req.user.permissions.includes(permission));
    if (!hasAllPermissions) {
        throw new api_error_1.ApiError(403, "You do not have permission to perform this action");
    }
    next();
});
exports.authorize = authorize;

"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireExpenseUnlocked = exports.requireRoomAccess = exports.authorize = exports.authenticate = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_1 = require("../config/env");
const api_error_1 = require("../utils/api-error");
const async_handler_1 = require("../middleware/async-handler");
const auth_service_1 = require("../modules/auth/auth.service");
const roles_1 = require("../constants/roles");
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
/**
 * Room-level access guard.
 * "member" — user must be an active member of the room (or admin).
 * "manager" — user must be the assigned manager of the room (or admin).
 * Lazy import to avoid circular dependency with room model.
 */
const requireRoomAccess = (level) => (0, async_handler_1.asyncHandler)(async (req, _res, next) => {
    if (!req.user) {
        throw new api_error_1.ApiError(401, "Authentication required");
    }
    const { roomId } = req.params;
    if (!roomId) {
        throw new api_error_1.ApiError(400, "Room ID is required");
    }
    // Admins bypass all room-level checks
    if (req.user.role.key === roles_1.ROLE_KEYS.ADMIN) {
        next();
        return;
    }
    const { Room } = await Promise.resolve().then(() => __importStar(require("../modules/rooms/room.model")));
    const { RoomMember } = await Promise.resolve().then(() => __importStar(require("../modules/rooms/room-member.model")));
    const room = await Room.findById(roomId);
    if (!room) {
        throw new api_error_1.ApiError(404, "Room not found");
    }
    const isAssignedManager = room.managerId?.toString() === req.user.id;
    const isCreatorManager = req.user.role.key === roles_1.ROLE_KEYS.ROOM_MANAGER &&
        room.createdBy?.toString() === req.user.id;
    const isManager = isAssignedManager || isCreatorManager;
    if (!room.isActive && !isManager) {
        throw new api_error_1.ApiError(404, "Room not found");
    }
    if (level === "manager") {
        if (!isManager) {
            throw new api_error_1.ApiError(403, "You are not the manager of this room");
        }
        next();
        return;
    }
    // level === "member": check active membership OR is manager
    if (isManager) {
        next();
        return;
    }
    const membership = await RoomMember.findOne({
        roomId,
        userId: req.user.id,
        isActive: true,
    });
    if (!membership) {
        throw new api_error_1.ApiError(403, "You are not a member of this room");
    }
    next();
});
exports.requireRoomAccess = requireRoomAccess;
/**
 * Middleware to block edits/deletes on locked expenses.
 * Must come after authenticate + requireRoomAccess.
 */
exports.requireExpenseUnlocked = (0, async_handler_1.asyncHandler)(async (req, _res, next) => {
    const { expId } = req.params;
    if (!expId) {
        next();
        return;
    }
    const { Expense } = await Promise.resolve().then(() => __importStar(require("../modules/expenses/expense.model")));
    const expense = await Expense.findById(expId);
    if (!expense) {
        throw new api_error_1.ApiError(404, "Expense not found");
    }
    if (expense.isLocked) {
        throw new api_error_1.ApiError(409, "This expense is locked because its bill period has been finalized. Reopen the bill to edit.");
    }
    next();
});

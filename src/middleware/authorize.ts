import type { NextFunction, Request, Response } from "express"
import jwt from "jsonwebtoken"
import { env } from "@/config/env"
import { ApiError } from "@/utils/api-error"
import { asyncHandler } from "@/middleware/async-handler"
import { authService } from "@/modules/auth/auth.service"
import { ROLE_KEYS } from "@/constants/roles"

export const authenticate = asyncHandler(
  async (req: Request, _res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization
    if (!authHeader?.startsWith("Bearer ")) {
      throw new ApiError(401, "Authentication required")
    }

    const token = authHeader.slice(7)

    try {
      const payload = jwt.verify(token, env.jwtSecret, {
        algorithms: ["HS256"],
      }) as { sub: string }
      req.user = await authService.getAuthContext(payload.sub)
      next()
    } catch {
      throw new ApiError(401, "Invalid or expired token")
    }
  }
)

export const authorize =
  (...requiredPermissions: string[]) =>
  asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new ApiError(401, "Authentication required")
    }

    const hasAllPermissions = requiredPermissions.every((permission) =>
      req.user!.permissions.includes(permission)
    )

    if (!hasAllPermissions) {
      throw new ApiError(403, "You do not have permission to perform this action")
    }

    next()
  })

/**
 * Room-level access guard.
 * "member" — user must be an active member of the room (or admin).
 * "manager" — user must be the assigned manager of the room (or admin).
 * Lazy import to avoid circular dependency with room model.
 */
export const requireRoomAccess = (level: "member" | "manager") =>
  asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new ApiError(401, "Authentication required")
    }

    const { roomId } = req.params
    if (!roomId) {
      throw new ApiError(400, "Room ID is required")
    }

    // Admins bypass all room-level checks
    if (req.user.role.key === ROLE_KEYS.ADMIN) {
      next()
      return
    }

    const { Room } = await import("@/modules/rooms/room.model")
    const { RoomMember } = await import("@/modules/rooms/room-member.model")

    const room = await Room.findById(roomId)
    if (!room) {
      throw new ApiError(404, "Room not found")
    }

    const isAssignedManager = room.managerId?.toString() === req.user.id
    const isCreatorManager =
      req.user.role.key === ROLE_KEYS.ROOM_MANAGER &&
      room.createdBy?.toString() === req.user.id
    const isManager = isAssignedManager || isCreatorManager

    if (!room.isActive && !isManager) {
      throw new ApiError(404, "Room not found")
    }

    if (level === "manager") {
      if (!isManager) {
        throw new ApiError(403, "You are not the manager of this room")
      }
      next()
      return
    }

    // level === "member": check active membership OR is manager
    if (isManager) {
      next()
      return
    }

    const membership = await RoomMember.findOne({
      roomId,
      userId: req.user.id,
      isActive: true,
    })

    if (!membership) {
      throw new ApiError(403, "You are not a member of this room")
    }

    next()
  })

/**
 * Middleware to block edits/deletes on locked expenses.
 * Must come after authenticate + requireRoomAccess.
 */
export const requireExpenseUnlocked = asyncHandler(
  async (req: Request, _res: Response, next: NextFunction) => {
    const { expId, roomId } = req.params
    if (!expId || !roomId) {
      next()
      return
    }

    const { Expense } = await import("@/modules/expenses/expense.model")
    const expense = await Expense.findOne({ _id: expId, roomId })

    if (!expense) {
      throw new ApiError(404, "Expense not found")
    }

    if (expense.isLocked) {
      throw new ApiError(
        409,
        "This expense is locked because its bill period has been finalized. Reopen the bill to edit."
      )
    }

    next()
  }
)

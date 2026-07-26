import type { Request, Response } from "express"
import { asyncHandler } from "@/middleware/async-handler"
import { ApiResponse } from "@/utils/api-response"
import { ApiError } from "@/utils/api-error"
import { ROLE_KEYS } from "@/constants/roles"
import { roomService } from "@/modules/rooms/room.service"

export const roomController = {
  listRooms: asyncHandler(async (req: Request, res: Response) => {
    const rooms = await roomService.listRooms(req.user!)
    res.json(ApiResponse.success(rooms))
  }),

  createRoom: asyncHandler(async (req: Request, res: Response) => {
    const { name, description, image } = req.body as {
      name: string
      description?: string
      image?: string
    }
    const room = await roomService.createRoom({ name, description, image }, req.user!)
    res.status(201).json(ApiResponse.success(room, "Room created"))
  }),

  getRoom: asyncHandler(async (req: Request, res: Response) => {
    const room = await roomService.getRoom(req.params["roomId"] as string)
    res.json(ApiResponse.success(room))
  }),

  updateRoom: asyncHandler(async (req: Request, res: Response) => {
    const body = req.body as Record<string, unknown>
    const update: {
      name?: string
      description?: string
      image?: string
      isActive?: boolean
    } = {}

    if (typeof body.name === "string") update.name = body.name
    if (typeof body.description === "string") update.description = body.description
    if (typeof body.image === "string") update.image = body.image
    if (typeof body.isActive === "boolean") update.isActive = body.isActive

    const room = await roomService.updateRoom(req.params["roomId"] as string, update)
    res.json(ApiResponse.success(room, "Room updated"))
  }),

  deleteRoom: asyncHandler(async (req: Request, res: Response) => {
    const result = await roomService.deleteRoom(req.params["roomId"] as string)
    res.json(ApiResponse.success(result))
  }),

  assignManager: asyncHandler(async (req: Request, res: Response) => {
    if (req.user?.role.key !== ROLE_KEYS.ADMIN) {
      throw new ApiError(403, "Only admins can assign room managers")
    }
    const { managerId } = req.body as { managerId: string }
    if (!managerId) {
      throw new ApiError(400, "managerId is required")
    }
    const room = await roomService.assignManager(req.params["roomId"] as string, managerId)
    res.json(ApiResponse.success(room, "Manager assigned"))
  }),

  listMembers: asyncHandler(async (req: Request, res: Response) => {
    const members = await roomService.listMembers(req.params["roomId"] as string)
    res.json(ApiResponse.success(members))
  }),

  listParticipants: asyncHandler(async (req: Request, res: Response) => {
    const participants = await roomService.listExpenseParticipants(
      req.params["roomId"] as string,
      req.user!
    )
    res.json(ApiResponse.success(participants))
  }),

  addMember: asyncHandler(async (req: Request, res: Response) => {
    const body = req.body as { userId?: string; email?: string; name?: string }
    const roomId = req.params["roomId"] as string

    if (body.email && body.name) {
      const result = await roomService.inviteMemberByEmail(roomId, {
        email: body.email,
        name: body.name,
      })
      const populated = await roomService.getMemberById(roomId, result.member._id.toString())
      const message = result.isNewUser
        ? "Member added. Login credentials sent by email."
        : "Existing member added to the room."
      res.status(201).json(
        ApiResponse.success(
          {
            member: populated,
            isNewUser: result.isNewUser,
            emailSent: result.isNewUser,
          },
          message
        )
      )
      return
    }

    if (!body.userId) {
      throw new ApiError(400, "email and name, or userId is required")
    }

    const member = await roomService.addMember(roomId, body.userId)
    const populated = await roomService.getMemberById(roomId, member._id.toString())
    res.status(201).json(
      ApiResponse.success({ member: populated, isNewUser: false, emailSent: false }, "Member added")
    )
  }),

  updateMember: asyncHandler(async (req: Request, res: Response) => {
    const { isActive } = req.body as { isActive?: boolean }
    const roomId = req.params["roomId"] as string
    const memberId = req.params["memberId"] as string

    if (typeof isActive !== "boolean") {
      throw new ApiError(400, "isActive boolean is required")
    }

    const member = await roomService.updateMemberStatus(roomId, memberId, isActive)
    res.json(
      ApiResponse.success(member, isActive ? "Member activated" : "Member deactivated")
    )
  }),
}

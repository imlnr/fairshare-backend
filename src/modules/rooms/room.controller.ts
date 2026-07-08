import type { Request, Response } from "express"
import { asyncHandler } from "@/middleware/async-handler"
import { ApiResponse } from "@/utils/api-response"
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
    const room = await roomService.createRoom({ name, description, image }, req.user!.id)
    res.status(201).json(ApiResponse.success(room, "Room created"))
  }),

  getRoom: asyncHandler(async (req: Request, res: Response) => {
    const room = await roomService.getRoom(req.params["roomId"] as string)
    res.json(ApiResponse.success(room))
  }),

  updateRoom: asyncHandler(async (req: Request, res: Response) => {
    const room = await roomService.updateRoom(req.params["roomId"] as string, req.body as object)
    res.json(ApiResponse.success(room, "Room updated"))
  }),

  deleteRoom: asyncHandler(async (req: Request, res: Response) => {
    const result = await roomService.deleteRoom(req.params["roomId"] as string)
    res.json(ApiResponse.success(result))
  }),

  assignManager: asyncHandler(async (req: Request, res: Response) => {
    const { managerId } = req.body as { managerId: string }
    const room = await roomService.assignManager(req.params["roomId"] as string, managerId)
    res.json(ApiResponse.success(room, "Manager assigned"))
  }),

  listMembers: asyncHandler(async (req: Request, res: Response) => {
    const members = await roomService.listMembers(req.params["roomId"] as string)
    res.json(ApiResponse.success(members))
  }),

  addMember: asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.body as { userId: string }
    const member = await roomService.addMember(req.params["roomId"] as string, userId)
    res.status(201).json(ApiResponse.success(member, "Member added"))
  }),

  deactivateMember: asyncHandler(async (req: Request, res: Response) => {
    const member = await roomService.deactivateMember(
      req.params["roomId"] as string,
      req.params["memberId"] as string
    )
    res.json(ApiResponse.success(member, "Member deactivated"))
  }),
}

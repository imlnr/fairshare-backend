import { Types } from "mongoose"
import { ApiError } from "@/utils/api-error"
import { Room } from "@/modules/rooms/room.model"
import { RoomMember } from "@/modules/rooms/room-member.model"
import { ROLE_KEYS } from "@/constants/roles"
import type { AuthenticatedUser } from "@/types/express"

export const roomService = {
  async listRooms(user: AuthenticatedUser) {
    if (user.role.key === ROLE_KEYS.ADMIN) {
      return Room.find().lean()
    }

    // Room managers and members only see rooms they belong to
    const memberships = await RoomMember.find({ userId: user.id, isActive: true }, "roomId").lean()
    const memberRoomIds = memberships.map((m) => m.roomId)
    const managedRooms = await Room.find({ managerId: user.id, isActive: true }).lean()
    const managedRoomIds = managedRooms.map((r) => (r as { _id: Types.ObjectId })._id)

    const allRoomIds = [...new Set([...memberRoomIds.map(String), ...managedRoomIds.map(String)])]
    return Room.find({ _id: { $in: allRoomIds } }).lean()
  },

  async createRoom(
    input: { name: string; description?: string; image?: string },
    createdById: string
  ) {
    return Room.create({
      name: input.name,
      description: input.description,
      image: input.image,
      createdBy: createdById,
      isActive: true,
    })
  },

  async getRoom(roomId: string) {
    const room = await Room.findById(roomId).lean()
    if (!room) throw new ApiError(404, "Room not found")
    return room
  },

  async updateRoom(
    roomId: string,
    update: { name?: string; description?: string; image?: string; isActive?: boolean }
  ) {
    const room = await Room.findByIdAndUpdate(roomId, { $set: update }, { returnDocument: "after" })
    if (!room) throw new ApiError(404, "Room not found")
    return room
  },

  async deleteRoom(roomId: string) {
    const room = await Room.findByIdAndUpdate(
      roomId,
      { $set: { isActive: false } },
      { returnDocument: "after" }
    )
    if (!room) throw new ApiError(404, "Room not found")
    return { message: "Room deactivated" }
  },

  async assignManager(roomId: string, managerId: string) {
    const room = await Room.findByIdAndUpdate(
      roomId,
      { $set: { managerId } },
      { returnDocument: "after" }
    )
    if (!room) throw new ApiError(404, "Room not found")
    return room
  },

  async listMembers(roomId: string) {
    return RoomMember.find({ roomId }).populate("userId", "name email image").lean()
  },

  async addMember(roomId: string, userId: string) {
    const existing = await RoomMember.findOne({ roomId, userId })
    if (existing) {
      if (existing.isActive) throw new ApiError(409, "User is already a member of this room")
      existing.isActive = true
      existing.leftAt = undefined
      existing.joinedAt = new Date()
      return existing.save()
    }
    return RoomMember.create({ roomId, userId })
  },

  async deactivateMember(roomId: string, memberId: string) {
    const member = await RoomMember.findOneAndUpdate(
      { _id: memberId, roomId },
      { $set: { isActive: false, leftAt: new Date() } },
      { returnDocument: "after" }
    )
    if (!member) throw new ApiError(404, "Member not found in this room")
    return member
  },
}

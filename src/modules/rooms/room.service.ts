import { ApiError } from "@/utils/api-error"
import { Room } from "@/modules/rooms/room.model"
import { RoomMember } from "@/modules/rooms/room-member.model"
import { User } from "@/modules/users/user.model"
import { userService } from "@/modules/users/user.service"
import { ROLE_KEYS } from "@/constants/roles"
import type { AuthenticatedUser } from "@/types/express"

export const roomService = {
  async listRooms(user: AuthenticatedUser) {
    if (user.role.key === ROLE_KEYS.ADMIN) {
      return Room.find().lean()
    }

    // Room managers and members only see rooms they belong to
    const memberships = await RoomMember.find({ userId: user.id, isActive: true }, "roomId").lean()
    const memberRoomIds = memberships.map((m) => String(m.roomId))
    const managerRoomIds = (
      await Room.find({ managerId: user.id }, "_id").lean()
    ).map((r) => String(r._id))
    const createdRoomIds = (
      await Room.find({ createdBy: user.id }, "_id").lean()
    ).map((r) => String(r._id))

    const allRoomIds = [...new Set([...memberRoomIds, ...managerRoomIds, ...createdRoomIds])]

    return Room.find({
      _id: { $in: allRoomIds },
      $or: [{ isActive: true }, { managerId: user.id }, { createdBy: user.id }],
    })
      .sort({ updatedAt: -1 })
      .lean()
  },

  async createRoom(
    input: { name: string; description?: string; image?: string },
    user: AuthenticatedUser
  ) {
    const isRoomManager = user.role.key === ROLE_KEYS.ROOM_MANAGER

    const room = await Room.create({
      name: input.name,
      description: input.description,
      image: input.image,
      createdBy: user.id,
      managerId: isRoomManager ? user.id : undefined,
      isActive: true,
    })

    return room
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
    const room = await Room.findById(roomId).lean()
    if (!room) throw new ApiError(404, "Room not found")

    const filter: { roomId: string; userId?: { $ne: string } } = { roomId }
    if (room.managerId) {
      filter.userId = { $ne: room.managerId.toString() }
    }

    return RoomMember.find(filter)
      .populate({
        path: "userId",
        select:
          "name email image isActive isEmailVerified authProvider lastLoginAt createdAt updatedAt roleId",
        populate: { path: "roleId", select: "name key" },
      })
      .sort({ joinedAt: -1 })
      .lean()
  },

  async listExpenseParticipants(roomId: string, user: AuthenticatedUser) {
    const room = await Room.findById(roomId).lean()
    if (!room) throw new ApiError(404, "Room not found")

    const isAdmin = user.role.key === ROLE_KEYS.ADMIN
    const isRoomManager =
      room.managerId?.toString() === user.id ||
      (user.role.key === ROLE_KEYS.ROOM_MANAGER && room.createdBy?.toString() === user.id)
    const includeManager = isAdmin || isRoomManager

    type Participant = {
      userId: string
      name: string
      email: string
      image?: string
      role: "manager" | "member"
      joinedAt: Date
      leftAt: Date | null
      isActive: boolean
    }

    const participants: Participant[] = []

    if (includeManager && room.managerId) {
      const manager = await User.findById(room.managerId)
        .select("name email image isActive")
        .lean()

      if (manager) {
        participants.push({
          userId: manager._id.toString(),
          name: manager.name,
          email: manager.email,
          image: manager.image ?? undefined,
          role: "manager",
          joinedAt: (room.createdAt as Date) ?? new Date(),
          leftAt: null,
          isActive: room.isActive,
        })
      }
    }

    const memberFilter: { roomId: string; userId?: { $ne: string } } = { roomId }
    if (room.managerId) {
      memberFilter.userId = { $ne: room.managerId.toString() }
    }

    const memberships = await RoomMember.find(memberFilter)
      .populate("userId", "name email image isActive")
      .sort({ joinedAt: -1 })
      .lean()

    for (const membership of memberships) {
      const user = membership.userId
      if (!user || typeof user !== "object" || !("name" in user) || !("email" in user)) {
        continue
      }

      participants.push({
        userId: String((user as { _id: unknown })._id),
        name: user.name as string,
        email: user.email as string,
        image: "image" in user ? (user.image as string | undefined) : undefined,
        role: "member",
        joinedAt: membership.joinedAt as Date,
        leftAt: (membership.leftAt as Date | null) ?? null,
        isActive: membership.isActive,
      })
    }

    return participants
  },

  async getMemberById(roomId: string, memberId: string) {
    const room = await Room.findById(roomId).lean()
    if (!room) throw new ApiError(404, "Room not found")

    const member = await RoomMember.findOne({ _id: memberId, roomId })
      .populate({
        path: "userId",
        select:
          "name email image isActive isEmailVerified authProvider lastLoginAt createdAt updatedAt roleId",
        populate: { path: "roleId", select: "name key" },
      })
      .lean()

    if (!member) throw new ApiError(404, "Member not found in this room")

    if (
      room.managerId &&
      member.userId &&
      String((member.userId as { _id: unknown })._id ?? member.userId) ===
        room.managerId.toString()
    ) {
      throw new ApiError(404, "Member not found in this room")
    }

    return member
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

  async inviteMemberByEmail(roomId: string, input: { email: string; name: string }) {
    const room = await Room.findById(roomId).lean()
    if (!room) throw new ApiError(404, "Room not found")

    const email = input.email.toLowerCase().trim()

    let user = await User.findOne({ email })

    if (user && room.managerId && user._id.toString() === room.managerId.toString()) {
      throw new ApiError(400, "The room manager cannot be added as a roommate")
    }

    let isNewUser = false
    if (!user) {
      user = await userService.createUserWithCredentials({
        name: input.name.trim(),
        email,
        roleKey: ROLE_KEYS.MEMBER,
        roleLabel: "Room Member",
      })
      isNewUser = true
    }

    const member = await this.addMember(roomId, user._id.toString())
    return { member, isNewUser, userId: user._id.toString() }
  },

  async activateMember(roomId: string, memberId: string) {
    const member = await RoomMember.findOneAndUpdate(
      { _id: memberId, roomId },
      { $set: { isActive: true, joinedAt: new Date() }, $unset: { leftAt: "" } },
      { returnDocument: "after" }
    )
      .populate({
        path: "userId",
        select:
          "name email image isActive isEmailVerified authProvider lastLoginAt createdAt updatedAt roleId",
        populate: { path: "roleId", select: "name key" },
      })
      .lean()

    if (!member) throw new ApiError(404, "Member not found in this room")
    return member
  },

  async deactivateMember(roomId: string, memberId: string) {
    const member = await RoomMember.findOneAndUpdate(
      { _id: memberId, roomId },
      { $set: { isActive: false, leftAt: new Date() } },
      { returnDocument: "after" }
    )
      .populate({
        path: "userId",
        select:
          "name email image isActive isEmailVerified authProvider lastLoginAt createdAt updatedAt roleId",
        populate: { path: "roleId", select: "name key" },
      })
      .lean()

    if (!member) throw new ApiError(404, "Member not found in this room")
    return member
  },

  async updateMemberStatus(roomId: string, memberId: string, isActive: boolean) {
    return isActive
      ? this.activateMember(roomId, memberId)
      : this.deactivateMember(roomId, memberId)
  },
}

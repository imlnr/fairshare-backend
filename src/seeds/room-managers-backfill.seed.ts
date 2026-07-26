import { ROLE_KEYS } from "@/constants/roles"
import { Room } from "@/modules/rooms/room.model"
import { RoomMember } from "@/modules/rooms/room-member.model"
import { Role } from "@/modules/roles/role.model"
import { User } from "@/modules/users/user.model"
import { logger } from "@/utils/logger"

export async function backfillRoomManagers(): Promise<void> {
  const managerRole = await Role.findOne({ key: ROLE_KEYS.ROOM_MANAGER }).lean()
  if (!managerRole) return

  const roomsNeedingManager = await Room.countDocuments({
    createdBy: { $exists: true },
    $or: [{ managerId: { $exists: false } }, { managerId: null }],
  })

  if (roomsNeedingManager === 0) {
    const managedRooms = await Room.find(
      { managerId: { $exists: true, $ne: null } },
      "_id managerId"
    ).lean()

    let removed = 0
    for (const room of managedRooms) {
      const result = await RoomMember.deleteOne({
        roomId: room._id,
        userId: room.managerId,
      })
      if (result.deletedCount > 0) removed += 1
    }

    if (removed > 0) {
      logger.info(`Removed manager self-memberships (${removed})`)
    }
    return
  }

  const rooms = await Room.find({
    createdBy: { $exists: true },
    $or: [{ managerId: { $exists: false } }, { managerId: null }],
  })

  let updated = 0

  for (const room of rooms) {
    const user = await User.findById(room.createdBy).lean()
    if (!user || user.roleId.toString() !== managerRole._id.toString()) {
      continue
    }

    room.managerId = room.createdBy
    await room.save()
    updated += 1
  }

  const managedRooms = await Room.find({ managerId: { $exists: true, $ne: null } }).lean()
  let removed = 0

  for (const room of managedRooms) {
    const result = await RoomMember.deleteOne({
      roomId: room._id,
      userId: room.managerId,
    })
    if (result.deletedCount > 0) removed += 1
  }

  if (updated > 0) {
    logger.info(`Backfilled room manager assignments (${updated})`)
  }

  if (removed > 0) {
    logger.info(`Removed manager self-memberships (${removed})`)
  }
}

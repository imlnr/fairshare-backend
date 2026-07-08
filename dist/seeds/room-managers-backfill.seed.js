"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.backfillRoomManagers = backfillRoomManagers;
const roles_1 = require("../constants/roles");
const room_model_1 = require("../modules/rooms/room.model");
const room_member_model_1 = require("../modules/rooms/room-member.model");
const role_model_1 = require("../modules/roles/role.model");
const user_model_1 = require("../modules/users/user.model");
const logger_1 = require("../utils/logger");
async function backfillRoomManagers() {
    const managerRole = await role_model_1.Role.findOne({ key: roles_1.ROLE_KEYS.ROOM_MANAGER }).lean();
    if (!managerRole)
        return;
    const rooms = await room_model_1.Room.find({
        createdBy: { $exists: true },
        $or: [{ managerId: { $exists: false } }, { managerId: null }],
    });
    let updated = 0;
    for (const room of rooms) {
        const user = await user_model_1.User.findById(room.createdBy).lean();
        if (!user || user.roleId.toString() !== managerRole._id.toString()) {
            continue;
        }
        room.managerId = room.createdBy;
        await room.save();
        updated += 1;
    }
    const managedRooms = await room_model_1.Room.find({ managerId: { $exists: true, $ne: null } }).lean();
    let removed = 0;
    for (const room of managedRooms) {
        const result = await room_member_model_1.RoomMember.deleteOne({
            roomId: room._id,
            userId: room.managerId,
        });
        if (result.deletedCount > 0)
            removed += 1;
    }
    if (updated > 0) {
        logger_1.logger.info(`Backfilled room manager assignments (${updated})`);
    }
    if (removed > 0) {
        logger_1.logger.info(`Removed manager self-memberships (${removed})`);
    }
}

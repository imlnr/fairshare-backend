"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.roomService = void 0;
const api_error_1 = require("../../utils/api-error");
const room_model_1 = require("../../modules/rooms/room.model");
const room_member_model_1 = require("../../modules/rooms/room-member.model");
const user_model_1 = require("../../modules/users/user.model");
const user_service_1 = require("../../modules/users/user.service");
const roles_1 = require("../../constants/roles");
exports.roomService = {
    async listRooms(user) {
        if (user.role.key === roles_1.ROLE_KEYS.ADMIN) {
            return room_model_1.Room.find().lean();
        }
        // Room managers and members only see rooms they belong to
        const memberships = await room_member_model_1.RoomMember.find({ userId: user.id, isActive: true }, "roomId").lean();
        const memberRoomIds = memberships.map((m) => String(m.roomId));
        const managerRoomIds = (await room_model_1.Room.find({ managerId: user.id }, "_id").lean()).map((r) => String(r._id));
        const createdRoomIds = (await room_model_1.Room.find({ createdBy: user.id }, "_id").lean()).map((r) => String(r._id));
        const allRoomIds = [...new Set([...memberRoomIds, ...managerRoomIds, ...createdRoomIds])];
        return room_model_1.Room.find({
            _id: { $in: allRoomIds },
            $or: [{ isActive: true }, { managerId: user.id }, { createdBy: user.id }],
        })
            .sort({ updatedAt: -1 })
            .lean();
    },
    async createRoom(input, user) {
        const isRoomManager = user.role.key === roles_1.ROLE_KEYS.ROOM_MANAGER;
        const room = await room_model_1.Room.create({
            name: input.name,
            description: input.description,
            image: input.image,
            createdBy: user.id,
            managerId: isRoomManager ? user.id : undefined,
            isActive: true,
        });
        return room;
    },
    async getRoom(roomId) {
        const room = await room_model_1.Room.findById(roomId).lean();
        if (!room)
            throw new api_error_1.ApiError(404, "Room not found");
        return room;
    },
    async updateRoom(roomId, update) {
        const room = await room_model_1.Room.findByIdAndUpdate(roomId, { $set: update }, { returnDocument: "after" });
        if (!room)
            throw new api_error_1.ApiError(404, "Room not found");
        return room;
    },
    async deleteRoom(roomId) {
        const room = await room_model_1.Room.findByIdAndUpdate(roomId, { $set: { isActive: false } }, { returnDocument: "after" });
        if (!room)
            throw new api_error_1.ApiError(404, "Room not found");
        return { message: "Room deactivated" };
    },
    async assignManager(roomId, managerId) {
        const room = await room_model_1.Room.findByIdAndUpdate(roomId, { $set: { managerId } }, { returnDocument: "after" });
        if (!room)
            throw new api_error_1.ApiError(404, "Room not found");
        return room;
    },
    async listMembers(roomId) {
        const room = await room_model_1.Room.findById(roomId).lean();
        if (!room)
            throw new api_error_1.ApiError(404, "Room not found");
        const filter = { roomId };
        if (room.managerId) {
            filter.userId = { $ne: room.managerId.toString() };
        }
        return room_member_model_1.RoomMember.find(filter)
            .populate({
            path: "userId",
            select: "name email image isActive isEmailVerified authProvider lastLoginAt createdAt updatedAt roleId",
            populate: { path: "roleId", select: "name key" },
        })
            .sort({ joinedAt: -1 })
            .lean();
    },
    async listExpenseParticipants(roomId, user) {
        const room = await room_model_1.Room.findById(roomId).lean();
        if (!room)
            throw new api_error_1.ApiError(404, "Room not found");
        const isAdmin = user.role.key === roles_1.ROLE_KEYS.ADMIN;
        const isRoomManager = room.managerId?.toString() === user.id ||
            (user.role.key === roles_1.ROLE_KEYS.ROOM_MANAGER && room.createdBy?.toString() === user.id);
        const includeManager = isAdmin || isRoomManager;
        const participants = [];
        if (includeManager && room.managerId) {
            const manager = await user_model_1.User.findById(room.managerId)
                .select("name email image isActive")
                .lean();
            if (manager) {
                participants.push({
                    userId: manager._id.toString(),
                    name: manager.name,
                    email: manager.email,
                    image: manager.image ?? undefined,
                    role: "manager",
                    joinedAt: room.createdAt ?? new Date(),
                    leftAt: null,
                    isActive: room.isActive,
                });
            }
        }
        const memberFilter = { roomId };
        if (room.managerId) {
            memberFilter.userId = { $ne: room.managerId.toString() };
        }
        const memberships = await room_member_model_1.RoomMember.find(memberFilter)
            .populate("userId", "name email image isActive")
            .sort({ joinedAt: -1 })
            .lean();
        for (const membership of memberships) {
            const user = membership.userId;
            if (!user || typeof user !== "object" || !("name" in user) || !("email" in user)) {
                continue;
            }
            participants.push({
                userId: String(user._id),
                name: user.name,
                email: user.email,
                image: "image" in user ? user.image : undefined,
                role: "member",
                joinedAt: membership.joinedAt,
                leftAt: membership.leftAt ?? null,
                isActive: membership.isActive,
            });
        }
        return participants;
    },
    async getMemberById(roomId, memberId) {
        const room = await room_model_1.Room.findById(roomId).lean();
        if (!room)
            throw new api_error_1.ApiError(404, "Room not found");
        const member = await room_member_model_1.RoomMember.findOne({ _id: memberId, roomId })
            .populate({
            path: "userId",
            select: "name email image isActive isEmailVerified authProvider lastLoginAt createdAt updatedAt roleId",
            populate: { path: "roleId", select: "name key" },
        })
            .lean();
        if (!member)
            throw new api_error_1.ApiError(404, "Member not found in this room");
        if (room.managerId &&
            member.userId &&
            String(member.userId._id ?? member.userId) ===
                room.managerId.toString()) {
            throw new api_error_1.ApiError(404, "Member not found in this room");
        }
        return member;
    },
    async addMember(roomId, userId) {
        const existing = await room_member_model_1.RoomMember.findOne({ roomId, userId });
        if (existing) {
            if (existing.isActive)
                throw new api_error_1.ApiError(409, "User is already a member of this room");
            existing.isActive = true;
            existing.leftAt = undefined;
            existing.joinedAt = new Date();
            return existing.save();
        }
        return room_member_model_1.RoomMember.create({ roomId, userId });
    },
    async inviteMemberByEmail(roomId, input) {
        const room = await room_model_1.Room.findById(roomId).lean();
        if (!room)
            throw new api_error_1.ApiError(404, "Room not found");
        const email = input.email.toLowerCase().trim();
        let user = await user_model_1.User.findOne({ email });
        if (user && room.managerId && user._id.toString() === room.managerId.toString()) {
            throw new api_error_1.ApiError(400, "The room manager cannot be added as a roommate");
        }
        let isNewUser = false;
        if (!user) {
            user = await user_service_1.userService.createUserWithCredentials({
                name: input.name.trim(),
                email,
                roleKey: roles_1.ROLE_KEYS.MEMBER,
                roleLabel: "Room Member",
            });
            isNewUser = true;
        }
        const member = await this.addMember(roomId, user._id.toString());
        return { member, isNewUser, userId: user._id.toString() };
    },
    async activateMember(roomId, memberId) {
        const member = await room_member_model_1.RoomMember.findOneAndUpdate({ _id: memberId, roomId }, { $set: { isActive: true, joinedAt: new Date() }, $unset: { leftAt: "" } }, { returnDocument: "after" })
            .populate({
            path: "userId",
            select: "name email image isActive isEmailVerified authProvider lastLoginAt createdAt updatedAt roleId",
            populate: { path: "roleId", select: "name key" },
        })
            .lean();
        if (!member)
            throw new api_error_1.ApiError(404, "Member not found in this room");
        return member;
    },
    async deactivateMember(roomId, memberId) {
        const member = await room_member_model_1.RoomMember.findOneAndUpdate({ _id: memberId, roomId }, { $set: { isActive: false, leftAt: new Date() } }, { returnDocument: "after" })
            .populate({
            path: "userId",
            select: "name email image isActive isEmailVerified authProvider lastLoginAt createdAt updatedAt roleId",
            populate: { path: "roleId", select: "name key" },
        })
            .lean();
        if (!member)
            throw new api_error_1.ApiError(404, "Member not found in this room");
        return member;
    },
    async updateMemberStatus(roomId, memberId, isActive) {
        return isActive
            ? this.activateMember(roomId, memberId)
            : this.deactivateMember(roomId, memberId);
    },
};

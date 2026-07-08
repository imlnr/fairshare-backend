"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.roomController = void 0;
const async_handler_1 = require("../../middleware/async-handler");
const api_response_1 = require("../../utils/api-response");
const api_error_1 = require("../../utils/api-error");
const room_service_1 = require("../../modules/rooms/room.service");
exports.roomController = {
    listRooms: (0, async_handler_1.asyncHandler)(async (req, res) => {
        const rooms = await room_service_1.roomService.listRooms(req.user);
        res.json(api_response_1.ApiResponse.success(rooms));
    }),
    createRoom: (0, async_handler_1.asyncHandler)(async (req, res) => {
        const { name, description, image } = req.body;
        const room = await room_service_1.roomService.createRoom({ name, description, image }, req.user);
        res.status(201).json(api_response_1.ApiResponse.success(room, "Room created"));
    }),
    getRoom: (0, async_handler_1.asyncHandler)(async (req, res) => {
        const room = await room_service_1.roomService.getRoom(req.params["roomId"]);
        res.json(api_response_1.ApiResponse.success(room));
    }),
    updateRoom: (0, async_handler_1.asyncHandler)(async (req, res) => {
        const room = await room_service_1.roomService.updateRoom(req.params["roomId"], req.body);
        res.json(api_response_1.ApiResponse.success(room, "Room updated"));
    }),
    deleteRoom: (0, async_handler_1.asyncHandler)(async (req, res) => {
        const result = await room_service_1.roomService.deleteRoom(req.params["roomId"]);
        res.json(api_response_1.ApiResponse.success(result));
    }),
    assignManager: (0, async_handler_1.asyncHandler)(async (req, res) => {
        const { managerId } = req.body;
        const room = await room_service_1.roomService.assignManager(req.params["roomId"], managerId);
        res.json(api_response_1.ApiResponse.success(room, "Manager assigned"));
    }),
    listMembers: (0, async_handler_1.asyncHandler)(async (req, res) => {
        const members = await room_service_1.roomService.listMembers(req.params["roomId"]);
        res.json(api_response_1.ApiResponse.success(members));
    }),
    listParticipants: (0, async_handler_1.asyncHandler)(async (req, res) => {
        const participants = await room_service_1.roomService.listExpenseParticipants(req.params["roomId"], req.user);
        res.json(api_response_1.ApiResponse.success(participants));
    }),
    addMember: (0, async_handler_1.asyncHandler)(async (req, res) => {
        const body = req.body;
        const roomId = req.params["roomId"];
        if (body.email && body.name) {
            const result = await room_service_1.roomService.inviteMemberByEmail(roomId, {
                email: body.email,
                name: body.name,
            });
            const populated = await room_service_1.roomService.getMemberById(roomId, result.member._id.toString());
            const message = result.isNewUser
                ? "Member added. Login credentials sent by email."
                : "Existing member added to the room.";
            res.status(201).json(api_response_1.ApiResponse.success({
                member: populated,
                isNewUser: result.isNewUser,
                emailSent: result.isNewUser,
            }, message));
            return;
        }
        if (!body.userId) {
            throw new api_error_1.ApiError(400, "email and name, or userId is required");
        }
        const member = await room_service_1.roomService.addMember(roomId, body.userId);
        const populated = await room_service_1.roomService.getMemberById(roomId, member._id.toString());
        res.status(201).json(api_response_1.ApiResponse.success({ member: populated, isNewUser: false, emailSent: false }, "Member added"));
    }),
    updateMember: (0, async_handler_1.asyncHandler)(async (req, res) => {
        const { isActive } = req.body;
        const roomId = req.params["roomId"];
        const memberId = req.params["memberId"];
        if (typeof isActive !== "boolean") {
            throw new api_error_1.ApiError(400, "isActive boolean is required");
        }
        const member = await room_service_1.roomService.updateMemberStatus(roomId, memberId, isActive);
        res.json(api_response_1.ApiResponse.success(member, isActive ? "Member activated" : "Member deactivated"));
    }),
};

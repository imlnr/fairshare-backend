"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.joinRequestService = void 0;
const api_error_1 = require("../../utils/api-error");
const roles_1 = require("../../constants/roles");
const user_model_1 = require("../../modules/users/user.model");
const user_service_1 = require("../../modules/users/user.service");
const room_manager_request_model_1 = require("../../modules/join-requests/room-manager-request.model");
exports.joinRequestService = {
    async submitRequest(input) {
        const email = input.email.toLowerCase().trim();
        const existingUser = await user_model_1.User.findOne({ email });
        if (existingUser) {
            throw new api_error_1.ApiError(409, "An account with this email already exists. Please sign in instead.");
        }
        const pendingRequest = await room_manager_request_model_1.RoomManagerRequest.findOne({ email, status: "pending" });
        if (pendingRequest) {
            throw new api_error_1.ApiError(409, "You already have a pending request. Please wait for admin review.");
        }
        return room_manager_request_model_1.RoomManagerRequest.create({
            name: input.name.trim(),
            email,
            phone: input.phone?.trim(),
            organization: input.organization?.trim(),
            message: input.message.trim(),
            status: "pending",
        });
    },
    async listRequests(status) {
        const query = status ? { status } : {};
        return room_manager_request_model_1.RoomManagerRequest.find(query).sort({ createdAt: -1 }).lean();
    },
    async approveRequest(requestId, adminId, adminNotes) {
        const request = await room_manager_request_model_1.RoomManagerRequest.findById(requestId);
        if (!request)
            throw new api_error_1.ApiError(404, "Request not found");
        if (request.status !== "pending") {
            throw new api_error_1.ApiError(400, `This request has already been ${request.status}`);
        }
        const existingUser = await user_model_1.User.findOne({ email: request.email });
        if (existingUser) {
            throw new api_error_1.ApiError(409, "A user with this email already exists");
        }
        const user = await user_service_1.userService.createUserWithCredentials({
            name: request.name,
            email: request.email,
            roleKey: roles_1.ROLE_KEYS.ROOM_MANAGER,
            roleLabel: "Room Manager",
        });
        request.status = "approved";
        request.reviewedBy = adminId;
        request.reviewedAt = new Date();
        request.adminNotes = adminNotes?.trim();
        request.createdUserId = user._id;
        await request.save();
        return { request, userId: user._id.toString() };
    },
    async rejectRequest(requestId, adminId, adminNotes) {
        const request = await room_manager_request_model_1.RoomManagerRequest.findById(requestId);
        if (!request)
            throw new api_error_1.ApiError(404, "Request not found");
        if (request.status !== "pending") {
            throw new api_error_1.ApiError(400, `This request has already been ${request.status}`);
        }
        request.status = "rejected";
        request.reviewedBy = adminId;
        request.reviewedAt = new Date();
        request.adminNotes = adminNotes?.trim();
        await request.save();
        return request;
    },
};

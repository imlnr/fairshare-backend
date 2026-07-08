"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.joinRequestController = void 0;
const async_handler_1 = require("../../middleware/async-handler");
const api_response_1 = require("../../utils/api-response");
const join_request_service_1 = require("../../modules/join-requests/join-request.service");
exports.joinRequestController = {
    submit: (0, async_handler_1.asyncHandler)(async (req, res) => {
        const request = await join_request_service_1.joinRequestService.submitRequest(req.body);
        res.status(201).json(api_response_1.ApiResponse.success(request, "Your request has been submitted. You will receive login credentials by email once approved."));
    }),
    list: (0, async_handler_1.asyncHandler)(async (req, res) => {
        const { status } = req.query;
        const requests = await join_request_service_1.joinRequestService.listRequests(typeof status === "string" ? status : undefined);
        res.json(api_response_1.ApiResponse.success(requests));
    }),
    approve: (0, async_handler_1.asyncHandler)(async (req, res) => {
        const { adminNotes } = req.body;
        const result = await join_request_service_1.joinRequestService.approveRequest(req.params["id"], req.user.id, adminNotes);
        res.json(api_response_1.ApiResponse.success(result, "Request approved. Login credentials sent by email."));
    }),
    reject: (0, async_handler_1.asyncHandler)(async (req, res) => {
        const { adminNotes } = req.body;
        const request = await join_request_service_1.joinRequestService.rejectRequest(req.params["id"], req.user.id, adminNotes);
        res.json(api_response_1.ApiResponse.success(request, "Request rejected"));
    }),
};

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.billController = void 0;
const async_handler_1 = require("../../middleware/async-handler");
const api_response_1 = require("../../utils/api-response");
const bill_service_1 = require("../../modules/bills/bill.service");
exports.billController = {
    listBills: (0, async_handler_1.asyncHandler)(async (req, res) => {
        const bills = await bill_service_1.billService.listBills(req.params["roomId"]);
        res.json(api_response_1.ApiResponse.success(bills));
    }),
    generateBill: (0, async_handler_1.asyncHandler)(async (req, res) => {
        const { period } = req.body;
        const bill = await bill_service_1.billService.generateBill(req.params["roomId"], period, req.user.id);
        res.status(201).json(api_response_1.ApiResponse.success(bill, `Bill generated for ${period}`));
    }),
    getBill: (0, async_handler_1.asyncHandler)(async (req, res) => {
        const bill = await bill_service_1.billService.getBill(req.params["billId"], req.user);
        res.json(api_response_1.ApiResponse.success(bill));
    }),
    reopenBill: (0, async_handler_1.asyncHandler)(async (req, res) => {
        const bill = await bill_service_1.billService.reopenBill(req.params["billId"]);
        res.json(api_response_1.ApiResponse.success(bill, "Bill reopened"));
    }),
};

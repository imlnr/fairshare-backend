"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.paymentController = void 0;
const async_handler_1 = require("../../middleware/async-handler");
const api_response_1 = require("../../utils/api-response");
const payment_service_1 = require("../../modules/payments/payment.service");
exports.paymentController = {
    listPayments: (0, async_handler_1.asyncHandler)(async (req, res) => {
        const payments = await payment_service_1.paymentService.listPayments(req.params["billId"]);
        res.json(api_response_1.ApiResponse.success(payments));
    }),
    recordPayment: (0, async_handler_1.asyncHandler)(async (req, res) => {
        const payment = await payment_service_1.paymentService.recordPayment(req.params["billId"], req.params["roomId"], req.body, req.user.id);
        res.status(201).json(api_response_1.ApiResponse.success(payment, "Payment recorded"));
    }),
};

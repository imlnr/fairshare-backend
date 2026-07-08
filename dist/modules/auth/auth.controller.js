"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authController = void 0;
const async_handler_1 = require("../../middleware/async-handler");
const api_response_1 = require("../../utils/api-response");
const auth_service_1 = require("../../modules/auth/auth.service");
exports.authController = {
    login: (0, async_handler_1.asyncHandler)(async (req, res) => {
        const input = req.body;
        const result = await auth_service_1.authService.login(input);
        res.json((0, api_response_1.sendSuccess)(result, "Logged in successfully"));
    }),
    googleLogin: (0, async_handler_1.asyncHandler)(async (req, res) => {
        const input = req.body;
        const result = await auth_service_1.authService.loginWithGoogle(input);
        res.json((0, api_response_1.sendSuccess)(result, "Google login successful"));
    }),
    getMe: (0, async_handler_1.asyncHandler)(async (req, res) => {
        const user = await auth_service_1.authService.getProfile(req.user.id);
        res.json((0, api_response_1.sendSuccess)(user, "Profile fetched successfully"));
    }),
};

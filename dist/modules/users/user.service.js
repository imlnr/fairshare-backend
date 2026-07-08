"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.userService = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const api_error_1 = require("../../utils/api-error");
const user_model_1 = require("../../modules/users/user.model");
const role_model_1 = require("../../modules/roles/role.model");
const password_1 = require("../../utils/password");
const email_1 = require("../../utils/email");
exports.userService = {
    async createUserWithCredentials(input) {
        const email = input.email.toLowerCase().trim();
        const existing = await user_model_1.User.findOne({ email });
        if (existing) {
            throw new api_error_1.ApiError(409, "A user with this email already exists");
        }
        const role = await role_model_1.Role.findOne({ key: input.roleKey });
        if (!role) {
            throw new api_error_1.ApiError(500, `${input.roleLabel} role is not configured`);
        }
        const plainPassword = input.password ?? (0, password_1.generateSecurePassword)();
        const hashedPassword = await bcrypt_1.default.hash(plainPassword, 12);
        const user = await user_model_1.User.create({
            name: input.name.trim(),
            email,
            password: hashedPassword,
            authProvider: "local",
            roleId: role._id,
            isEmailVerified: true,
        });
        if (input.sendEmail !== false) {
            await (0, email_1.sendCredentialsEmail)({
                to: email,
                name: user.name,
                password: plainPassword,
                roleLabel: input.roleLabel,
            });
        }
        return user;
    },
};

"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authService = void 0;
const mongoose_1 = require("mongoose");
const bcrypt_1 = __importDefault(require("bcrypt"));
const google_auth_library_1 = require("google-auth-library");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_1 = require("../../config/env");
const api_error_1 = require("../../utils/api-error");
const rbac_service_1 = require("../../modules/rbac/rbac.service");
const user_model_1 = require("../../modules/users/user.model");
const googleClient = new google_auth_library_1.OAuth2Client(env_1.env.googleClientId);
async function toSafeUser(user, permissions) {
    return {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        image: user.image,
        authProvider: user.authProvider,
        role: {
            id: user.roleId._id.toString(),
            key: user.roleId.key,
            name: user.roleId.name,
        },
        permissions,
        isActive: user.isActive,
        isEmailVerified: user.isEmailVerified,
        lastLoginAt: user.lastLoginAt,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
    };
}
async function getPopulatedUser(userId) {
    const user = await user_model_1.User.findById(userId).populate("roleId");
    if (!user || !user.roleId || typeof user.roleId === "string") {
        throw new api_error_1.ApiError(404, "User not found");
    }
    return user;
}
function signToken(userId) {
    return jsonwebtoken_1.default.sign({ sub: userId }, env_1.env.jwtSecret, {
        expiresIn: env_1.env.jwtExpiresIn,
    });
}
async function buildAuthResult(user) {
    const permissions = await (0, rbac_service_1.getPermissionsForRole)(new mongoose_1.Types.ObjectId(user.roleId._id.toString()));
    return {
        user: await toSafeUser(user, permissions),
        tokens: { accessToken: signToken(user._id.toString()) },
    };
}
exports.authService = {
    async login(input) {
        const user = await user_model_1.User.findOne({ email: input.email }).select("+password").populate("roleId");
        if (!user || !user.password) {
            throw new api_error_1.ApiError(401, "Invalid email or password");
        }
        if (!user.isActive) {
            throw new api_error_1.ApiError(403, "Your account has been deactivated");
        }
        const isPasswordValid = await bcrypt_1.default.compare(input.password, user.password);
        if (!isPasswordValid) {
            throw new api_error_1.ApiError(401, "Invalid email or password");
        }
        user.lastLoginAt = new Date();
        await user.save();
        const populatedUser = await getPopulatedUser(user._id.toString());
        return buildAuthResult(populatedUser);
    },
    async loginWithGoogle(input) {
        const ticket = await googleClient.verifyIdToken({
            idToken: input.idToken,
            audience: env_1.env.googleClientId,
        });
        const payload = ticket.getPayload();
        if (!payload?.sub || !payload.email) {
            throw new api_error_1.ApiError(401, "Invalid Google token");
        }
        const user = await user_model_1.User.findOne({
            $or: [{ googleId: payload.sub }, { email: payload.email.toLowerCase() }],
        });
        if (!user) {
            throw new api_error_1.ApiError(403, "No account found for this Google email. Request access or contact your room manager.");
        }
        user.name = payload.name ?? user.name;
        user.image = payload.picture ?? user.image;
        user.googleId = payload.sub;
        user.googleEmail = payload.email.toLowerCase();
        user.isEmailVerified = payload.email_verified ?? user.isEmailVerified;
        user.lastLoginAt = new Date();
        if (user.authProvider === "local" && user.password) {
            user.authProvider = "both";
        }
        else if (user.authProvider !== "both") {
            user.authProvider = "google";
        }
        await user.save();
        if (!user.isActive) {
            throw new api_error_1.ApiError(403, "Your account has been deactivated");
        }
        const populatedUser = await getPopulatedUser(user._id.toString());
        return buildAuthResult(populatedUser);
    },
    async getAuthContext(userId) {
        const user = await getPopulatedUser(userId);
        const permissions = await (0, rbac_service_1.getPermissionsForRole)(new mongoose_1.Types.ObjectId(user.roleId._id.toString()));
        return {
            id: user._id.toString(),
            email: user.email,
            name: user.name,
            image: user.image,
            role: {
                id: user.roleId._id.toString(),
                key: user.roleId.key,
                name: user.roleId.name,
            },
            permissions,
        };
    },
    async getProfile(userId) {
        const user = await getPopulatedUser(userId);
        const permissions = await (0, rbac_service_1.getPermissionsForRole)(new mongoose_1.Types.ObjectId(user.roleId._id.toString()));
        return toSafeUser(user, permissions);
    },
};

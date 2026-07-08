"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rbacController = void 0;
const async_handler_1 = require("../../middleware/async-handler");
const api_response_1 = require("../../utils/api-response");
const permission_model_1 = require("../../modules/permissions/permission.model");
const role_model_1 = require("../../modules/roles/role.model");
const role_permission_model_1 = require("../../modules/roles/role-permission.model");
exports.rbacController = {
    listRoles: (0, async_handler_1.asyncHandler)(async (_req, res) => {
        const roles = await role_model_1.Role.find().sort({ name: 1 });
        res.json((0, api_response_1.sendSuccess)(roles, "Roles fetched successfully"));
    }),
    listPermissions: (0, async_handler_1.asyncHandler)(async (_req, res) => {
        const permissions = await permission_model_1.Permission.find().sort({ resource: 1, action: 1 });
        res.json((0, api_response_1.sendSuccess)(permissions, "Permissions fetched successfully"));
    }),
    listRolePermissions: (0, async_handler_1.asyncHandler)(async (_req, res) => {
        const rolePermissions = await role_permission_model_1.RolePermission.find()
            .populate("roleId", "key name")
            .populate("permissionId", "key resource action description");
        res.json((0, api_response_1.sendSuccess)(rolePermissions, "Role permissions fetched successfully"));
    }),
};

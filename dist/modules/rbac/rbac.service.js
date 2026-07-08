"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPermissionsForRole = getPermissionsForRole;
exports.getRoleByKey = getRoleByKey;
exports.roleHasPermission = roleHasPermission;
const permission_model_1 = require("@/modules/permissions/permission.model");
const role_permission_model_1 = require("@/modules/roles/role-permission.model");
const role_model_1 = require("@/modules/roles/role.model");
async function getPermissionsForRole(roleId) {
    const rolePermissions = await role_permission_model_1.RolePermission.find({ roleId }).populate("permissionId");
    return rolePermissions
        .map((entry) => {
        const permission = entry.permissionId;
        return permission?.key;
    })
        .filter((key) => Boolean(key));
}
async function getRoleByKey(roleKey) {
    return role_model_1.Role.findOne({ key: roleKey });
}
async function roleHasPermission(roleId, permissionKey) {
    const permission = await permission_model_1.Permission.findOne({ key: permissionKey });
    if (!permission)
        return false;
    const mapping = await role_permission_model_1.RolePermission.findOne({ roleId, permissionId: permission._id });
    return Boolean(mapping);
}

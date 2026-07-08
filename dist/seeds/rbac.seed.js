"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedRbac = seedRbac;
const roles_1 = require("../constants/roles");
const permissions_1 = require("../constants/permissions");
const permission_model_1 = require("../modules/permissions/permission.model");
const role_model_1 = require("../modules/roles/role.model");
const role_permission_model_1 = require("../modules/roles/role-permission.model");
const logger_1 = require("../utils/logger");
const ROLE_DESCRIPTIONS = {
    admin: "Full system access across users, rooms, and settings.",
    room_manager: "Manages rooms, members, and shared expenses.",
    member: "Room member with access to shared expenses.",
    viewer: "Read-only access to rooms and expense data.",
};
async function seedRbac() {
    for (const permission of permissions_1.PERMISSION_SEEDS) {
        await permission_model_1.Permission.findOneAndUpdate({ key: permission.key }, {
            $set: {
                resource: permission.resource,
                action: permission.action,
                description: permission.description,
            },
        }, { upsert: true, returnDocument: "after" });
    }
    for (const roleKey of Object.values(roles_1.ROLE_KEYS)) {
        await role_model_1.Role.findOneAndUpdate({ key: roleKey }, {
            $set: {
                name: roles_1.ROLE_LABELS[roleKey],
                description: ROLE_DESCRIPTIONS[roleKey],
                isSystem: true,
            },
        }, { upsert: true, returnDocument: "after" });
    }
    const permissions = await permission_model_1.Permission.find();
    const permissionMap = new Map(permissions.map((permission) => [permission.key, permission._id]));
    const roles = await role_model_1.Role.find();
    const roleMap = new Map(roles.map((role) => [role.key, role._id]));
    for (const [roleKey, permissionKeys] of Object.entries(permissions_1.ROLE_PERMISSION_MAP)) {
        const roleId = roleMap.get(roleKey);
        if (!roleId)
            continue;
        await role_permission_model_1.RolePermission.deleteMany({ roleId });
        const rolePermissions = permissionKeys
            .map((permissionKey) => {
            const permissionId = permissionMap.get(permissionKey);
            if (!permissionId)
                return null;
            return { roleId, permissionId };
        })
            .filter((entry) => entry !== null);
        if (rolePermissions.length > 0) {
            await role_permission_model_1.RolePermission.insertMany(rolePermissions);
        }
    }
    logger_1.logger.info("RBAC seed completed");
}

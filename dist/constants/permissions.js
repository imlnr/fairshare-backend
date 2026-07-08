"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ROLE_PERMISSION_MAP = exports.PERMISSION_SEEDS = void 0;
exports.PERMISSION_SEEDS = [
    { key: "users:read", resource: "users", action: "read", description: "View users" },
    { key: "users:create", resource: "users", action: "create", description: "Create users" },
    { key: "users:update", resource: "users", action: "update", description: "Update users" },
    { key: "users:delete", resource: "users", action: "delete", description: "Delete users" },
    { key: "roles:read", resource: "roles", action: "read", description: "View roles" },
    { key: "roles:manage", resource: "roles", action: "manage", description: "Manage roles and permissions" },
    { key: "rooms:read", resource: "rooms", action: "read", description: "View rooms" },
    { key: "rooms:create", resource: "rooms", action: "create", description: "Create rooms" },
    { key: "rooms:update", resource: "rooms", action: "update", description: "Update rooms" },
    { key: "rooms:delete", resource: "rooms", action: "delete", description: "Delete rooms" },
    { key: "rooms:manage_members", resource: "rooms", action: "manage_members", description: "Manage room members" },
    { key: "expenses:read", resource: "expenses", action: "read", description: "View expenses" },
    { key: "expenses:create", resource: "expenses", action: "create", description: "Create expenses" },
    { key: "expenses:update", resource: "expenses", action: "update", description: "Update expenses" },
    { key: "expenses:delete", resource: "expenses", action: "delete", description: "Delete expenses" },
    { key: "reports:read", resource: "reports", action: "read", description: "View reports" },
];
exports.ROLE_PERMISSION_MAP = {
    admin: exports.PERMISSION_SEEDS.map((permission) => permission.key),
    room_manager: [
        "users:read",
        "rooms:read",
        "rooms:create",
        "rooms:update",
        "rooms:manage_members",
        "expenses:read",
        "expenses:create",
        "expenses:update",
        "expenses:delete",
        "reports:read",
    ],
    member: [
        "rooms:read",
        "expenses:read",
        "expenses:create",
        "expenses:update",
        "reports:read",
    ],
    viewer: ["rooms:read", "expenses:read", "reports:read"],
};

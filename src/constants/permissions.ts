export type PermissionSeed = {
  key: string
  resource: string
  action: string
  description: string
}

export const PERMISSION_SEEDS: PermissionSeed[] = [
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
  { key: "bills:read", resource: "bills", action: "read", description: "View bills" },
  { key: "bills:generate", resource: "bills", action: "generate", description: "Generate and lock monthly bills" },
  { key: "bills:reopen", resource: "bills", action: "reopen", description: "Reopen a locked bill for editing" },
  { key: "payments:read", resource: "payments", action: "read", description: "View payment records" },
  { key: "payments:create", resource: "payments", action: "create", description: "Record payments" },
  { key: "join_requests:read", resource: "join_requests", action: "read", description: "View room manager join requests" },
  { key: "join_requests:review", resource: "join_requests", action: "review", description: "Approve or reject join requests" },
]

export const ROLE_PERMISSION_MAP: Record<string, string[]> = {
  admin: PERMISSION_SEEDS.map((permission) => permission.key),
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
    "bills:read",
    "bills:generate",
    "bills:reopen",
    "payments:read",
    "payments:create",
  ],
  member: [
    "rooms:read",
    "expenses:read",
    "expenses:create",
    "reports:read",
    "bills:read",
    "payments:read",
  ],
  viewer: ["rooms:read", "expenses:read", "reports:read"],
}

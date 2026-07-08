export const ROLE_KEYS = {
  ADMIN: "admin",
  ROOM_MANAGER: "room_manager",
  MEMBER: "member",
  VIEWER: "viewer",
} as const

export type RoleKey = (typeof ROLE_KEYS)[keyof typeof ROLE_KEYS]

export const ROLE_LABELS: Record<RoleKey, string> = {
  admin: "Admin",
  room_manager: "Room Manager",
  member: "User",
  viewer: "Viewer",
}

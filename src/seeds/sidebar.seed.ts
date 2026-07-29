import type { SidebarAccessLevel, SidebarSection } from "@/modules/sidebar/sidebar-menu-item.model"
import { SidebarMenuItem } from "@/modules/sidebar/sidebar-menu-item.model"
import { logger } from "@/utils/logger"

type RoleAccessSeed = {
  admin: SidebarAccessLevel
  room_manager: SidebarAccessLevel
  member: SidebarAccessLevel
  viewer: SidebarAccessLevel
}

type SidebarSeed = {
  key: string
  title: string
  path: string
  iconName: string
  section: SidebarSection
  parentKey?: string | null
  sortOrder: number
  isSystem: boolean
  requiredPermission?: string | null
  roleAccess: RoleAccessSeed
}

const SIDEBAR_SEEDS: SidebarSeed[] = [
  {
    key: "dashboard",
    title: "Dashboard",
    path: "/dashboard",
    iconName: "Home",
    section: "main",
    sortOrder: 10,
    isSystem: true,
    roleAccess: {
      admin: "write",
      room_manager: "read",
      member: "read",
      viewer: "view",
    },
  },
  {
    key: "my_rooms",
    title: "My Rooms",
    path: "/rooms",
    iconName: "DoorOpen",
    section: "main",
    sortOrder: 20,
    isSystem: true,
    requiredPermission: "rooms:create",
    roleAccess: {
      admin: "write",
      room_manager: "write",
      member: "none",
      viewer: "none",
    },
  },
  {
    key: "settings",
    title: "Settings",
    path: "/settings",
    iconName: "Settings",
    section: "main",
    sortOrder: 90,
    isSystem: true,
    roleAccess: {
      admin: "write",
      room_manager: "read",
      member: "read",
      viewer: "view",
    },
  },
  {
    key: "admin",
    title: "Admin",
    path: "#",
    iconName: "Shield",
    section: "admin",
    sortOrder: 10,
    isSystem: true,
    roleAccess: {
      admin: "write",
      room_manager: "none",
      member: "none",
      viewer: "none",
    },
  },
  {
    key: "admin_rooms",
    title: "Rooms",
    path: "/admin/rooms",
    iconName: "Building2",
    section: "admin",
    parentKey: "admin",
    sortOrder: 11,
    isSystem: true,
    requiredPermission: "join_requests:review",
    roleAccess: {
      admin: "write",
      room_manager: "none",
      member: "none",
      viewer: "none",
    },
  },
  {
    key: "admin_join_requests",
    title: "Join Requests",
    path: "/admin/join-requests",
    iconName: "UserPlus",
    section: "admin",
    parentKey: "admin",
    sortOrder: 12,
    isSystem: true,
    requiredPermission: "join_requests:read",
    roleAccess: {
      admin: "write",
      room_manager: "none",
      member: "none",
      viewer: "none",
    },
  },
  {
    key: "admin_sidebar",
    title: "Sidebar",
    path: "/admin/sidebar",
    iconName: "PanelLeft",
    section: "admin",
    parentKey: "admin",
    sortOrder: 13,
    isSystem: true,
    requiredPermission: "sidebar:manage",
    roleAccess: {
      admin: "write",
      room_manager: "none",
      member: "none",
      viewer: "none",
    },
  },
  {
    key: "admin_roles",
    title: "Roles & Permissions",
    path: "/admin/roles",
    iconName: "KeyRound",
    section: "admin",
    parentKey: "admin",
    sortOrder: 14,
    isSystem: true,
    requiredPermission: "roles:manage",
    roleAccess: {
      admin: "write",
      room_manager: "none",
      member: "none",
      viewer: "none",
    },
  },
]

export async function seedSidebarMenu(): Promise<void> {
  for (const item of SIDEBAR_SEEDS) {
    await SidebarMenuItem.findOneAndUpdate(
      { key: item.key },
      {
        $set: {
          title: item.title,
          path: item.path,
          iconName: item.iconName,
          section: item.section,
          parentKey: item.parentKey ?? null,
          sortOrder: item.sortOrder,
          isSystem: item.isSystem,
          requiredPermission: item.requiredPermission ?? null,
          roleAccess: item.roleAccess,
          isActive: true,
        },
      },
      { upsert: true, returnDocument: "after" }
    )
  }

  logger.info(`Sidebar menu seeded (${SIDEBAR_SEEDS.length} items)`)
}

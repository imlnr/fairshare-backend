import type { RoleKey } from "@/constants/roles"
import { ROLE_KEYS } from "@/constants/roles"
import { ApiError } from "@/utils/api-error"
import type { AuthenticatedUser } from "@/types/express"
import {
  SIDEBAR_ACCESS_LEVELS,
  SIDEBAR_SECTIONS,
  SidebarMenuItem,
  type SidebarAccessLevel,
  type SidebarSection,
} from "@/modules/sidebar/sidebar-menu-item.model"

export type SidebarRoleAccessInput = {
  admin?: SidebarAccessLevel
  room_manager?: SidebarAccessLevel
  member?: SidebarAccessLevel
  viewer?: SidebarAccessLevel
}

export type CreateSidebarItemInput = {
  key: string
  title: string
  path: string
  iconName: string
  section?: SidebarSection
  parentKey?: string | null
  sortOrder?: number
  isActive?: boolean
  requiredPermission?: string | null
  roleAccess?: SidebarRoleAccessInput
}

export type UpdateSidebarItemInput = Partial<
  Omit<CreateSidebarItemInput, "key"> & { key?: never }
>

function isAccessLevel(value: unknown): value is SidebarAccessLevel {
  return typeof value === "string" && (SIDEBAR_ACCESS_LEVELS as readonly string[]).includes(value)
}

function normalizeRoleAccess(input?: SidebarRoleAccessInput) {
  return {
    admin: isAccessLevel(input?.admin) ? input!.admin! : "none",
    room_manager: isAccessLevel(input?.room_manager) ? input!.room_manager! : "none",
    member: isAccessLevel(input?.member) ? input!.member! : "none",
    viewer: isAccessLevel(input?.viewer) ? input!.viewer! : "none",
  }
}

function getRoleAccess(
  roleAccess: { admin?: string; room_manager?: string; member?: string; viewer?: string } | undefined,
  roleKey: RoleKey
): SidebarAccessLevel {
  const value = roleAccess?.[roleKey]
  return isAccessLevel(value) ? value : "none"
}

function toDto(item: {
  _id: { toString(): string }
  key: string
  title: string
  path: string
  iconName: string
  section: string
  parentKey?: string | null
  sortOrder: number
  isActive: boolean
  isSystem: boolean
  requiredPermission?: string | null
  roleAccess?: {
    admin?: string
    room_manager?: string
    member?: string
    viewer?: string
  }
  createdAt?: Date
  updatedAt?: Date
}) {
  return {
    id: item._id.toString(),
    key: item.key,
    title: item.title,
    path: item.path,
    iconName: item.iconName,
    section: item.section,
    parentKey: item.parentKey ?? null,
    sortOrder: item.sortOrder,
    isActive: item.isActive,
    isSystem: item.isSystem,
    requiredPermission: item.requiredPermission ?? null,
    roleAccess: {
      admin: getRoleAccess(item.roleAccess, ROLE_KEYS.ADMIN),
      room_manager: getRoleAccess(item.roleAccess, ROLE_KEYS.ROOM_MANAGER),
      member: getRoleAccess(item.roleAccess, ROLE_KEYS.MEMBER),
      viewer: getRoleAccess(item.roleAccess, ROLE_KEYS.VIEWER),
    },
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  }
}

function buildTree<T extends { key: string; parentKey: string | null; sortOrder: number; items?: T[] }>(
  items: T[]
): T[] {
  const byKey = new Map(items.map((item) => [item.key, { ...item, items: [] as T[] }]))
  const roots: T[] = []

  for (const item of byKey.values()) {
    if (item.parentKey && byKey.has(item.parentKey)) {
      byKey.get(item.parentKey)!.items!.push(item)
    } else {
      roots.push(item)
    }
  }

  const sortRecursive = (nodes: T[]) => {
    nodes.sort((a, b) => a.sortOrder - b.sortOrder)
    for (const node of nodes) {
      if (node.items?.length) sortRecursive(node.items)
    }
  }

  sortRecursive(roots)
  return roots
}

export const sidebarService = {
  async listAll() {
    const items = await SidebarMenuItem.find().sort({ section: 1, sortOrder: 1 }).lean()
    return items.map(toDto)
  },

  async getMenuForUser(user: AuthenticatedUser) {
    const items = await SidebarMenuItem.find({ isActive: true }).sort({ sortOrder: 1 }).lean()

    // Visibility comes from Roles & Permissions (requiredPermission), not sidebar roleAccess.
    const visible = items
      .map(toDto)
      .filter((item) => {
        if (item.requiredPermission && !user.permissions.includes(item.requiredPermission)) {
          return false
        }
        return true
      })
      .map((item) => ({
        ...item,
        access: item.roleAccess[user.role.key as RoleKey] ?? "read",
      }))

    type MenuNode = (typeof visible)[number] & { items: MenuNode[] }

    const withChildren = buildTree(
      visible.map((item) => ({ ...item, items: [] as MenuNode[] }))
    ) as MenuNode[]

    const prune = (nodes: MenuNode[]): MenuNode[] => {
      return nodes
        .map((node) => {
          const children = node.items?.length ? prune(node.items) : []
          if (children.length === 0 && (node.path === "#" || !node.path)) {
            return null
          }
          return { ...node, items: children }
        })
        .filter((node): node is MenuNode => node !== null)
    }

    const main = prune(withChildren.filter((i) => i.section === "main"))
    const admin = prune(withChildren.filter((i) => i.section === "admin"))
    const secondary = prune(withChildren.filter((i) => i.section === "secondary"))

    return { main, admin, secondary }
  },

  async create(input: CreateSidebarItemInput) {
    const key = input.key?.trim()
    if (!key || !input.title?.trim() || !input.path?.trim() || !input.iconName?.trim()) {
      throw new ApiError(400, "key, title, path, and iconName are required")
    }

    const section = input.section ?? "main"
    if (!(SIDEBAR_SECTIONS as readonly string[]).includes(section)) {
      throw new ApiError(400, "Invalid section")
    }

    const existing = await SidebarMenuItem.findOne({ key })
    if (existing) {
      throw new ApiError(409, "Sidebar item key already exists")
    }

    if (input.parentKey) {
      const parent = await SidebarMenuItem.findOne({ key: input.parentKey })
      if (!parent) throw new ApiError(400, "Parent sidebar item not found")
    }

    const created = await SidebarMenuItem.create({
      key,
      title: input.title.trim(),
      path: input.path.trim(),
      iconName: input.iconName.trim(),
      section,
      parentKey: input.parentKey ?? null,
      sortOrder: input.sortOrder ?? 100,
      isActive: input.isActive ?? true,
      isSystem: false,
      requiredPermission: input.requiredPermission ?? null,
      roleAccess: normalizeRoleAccess(input.roleAccess),
    })

    return toDto(created.toObject())
  },

  async update(id: string, input: UpdateSidebarItemInput) {
    const item = await SidebarMenuItem.findById(id)
    if (!item) throw new ApiError(404, "Sidebar item not found")

    if (input.title !== undefined) item.title = input.title.trim()
    if (input.path !== undefined) item.path = input.path.trim()
    if (input.iconName !== undefined) item.iconName = input.iconName.trim()
    if (input.section !== undefined) {
      if (!(SIDEBAR_SECTIONS as readonly string[]).includes(input.section)) {
        throw new ApiError(400, "Invalid section")
      }
      item.section = input.section
    }
    if (input.parentKey !== undefined) {
      if (input.parentKey === item.key) {
        throw new ApiError(400, "Item cannot be its own parent")
      }
      if (input.parentKey) {
        const parent = await SidebarMenuItem.findOne({ key: input.parentKey })
        if (!parent) throw new ApiError(400, "Parent sidebar item not found")
      }
      item.parentKey = input.parentKey
    }
    if (input.sortOrder !== undefined) item.sortOrder = input.sortOrder
    if (input.isActive !== undefined) item.isActive = input.isActive
    if (input.requiredPermission !== undefined) {
      item.requiredPermission = input.requiredPermission
    }
    if (input.roleAccess !== undefined) {
      const current = {
        admin: getRoleAccess(item.roleAccess, ROLE_KEYS.ADMIN),
        room_manager: getRoleAccess(item.roleAccess, ROLE_KEYS.ROOM_MANAGER),
        member: getRoleAccess(item.roleAccess, ROLE_KEYS.MEMBER),
        viewer: getRoleAccess(item.roleAccess, ROLE_KEYS.VIEWER),
      }
      item.roleAccess = normalizeRoleAccess({ ...current, ...input.roleAccess })
    }

    await item.save()
    return toDto(item.toObject())
  },

  async remove(id: string) {
    const item = await SidebarMenuItem.findById(id)
    if (!item) throw new ApiError(404, "Sidebar item not found")

    if (item.isSystem) {
      item.isActive = false
      await item.save()
      return toDto(item.toObject())
    }

    const children = await SidebarMenuItem.countDocuments({ parentKey: item.key })
    if (children > 0) {
      throw new ApiError(400, "Remove or reassign child items before deleting")
    }

    await item.deleteOne()
    return { id, deleted: true }
  },

  async reorder(items: Array<{ id: string; sortOrder: number }>) {
    if (!Array.isArray(items) || items.length === 0) {
      throw new ApiError(400, "items array is required")
    }

    await Promise.all(
      items.map((row) =>
        SidebarMenuItem.findByIdAndUpdate(row.id, { $set: { sortOrder: row.sortOrder } })
      )
    )

    return this.listAll()
  },
}

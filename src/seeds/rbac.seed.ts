import { Types } from "mongoose"
import { ROLE_KEYS, ROLE_LABELS, type RoleKey } from "@/constants/roles"
import { PERMISSION_SEEDS, ROLE_PERMISSION_MAP } from "@/constants/permissions"
import { Permission } from "@/modules/permissions/permission.model"
import { Role } from "@/modules/roles/role.model"
import { RolePermission } from "@/modules/roles/role-permission.model"
import { logger } from "@/utils/logger"

const ROLE_DESCRIPTIONS: Record<string, string> = {
  admin: "Full system access across users, rooms, and settings.",
  room_manager: "Manages rooms, members, and shared expenses.",
  member: "Room member with access to shared expenses.",
  viewer: "Read-only access to rooms and expense data.",
}

export async function seedRbac(): Promise<void> {
  for (const permission of PERMISSION_SEEDS) {
    await Permission.findOneAndUpdate(
      { key: permission.key },
      {
        $set: {
          resource: permission.resource,
          action: permission.action,
          description: permission.description,
        },
      },
      { upsert: true, returnDocument: "after" }
    )
  }

  for (const roleKey of Object.values(ROLE_KEYS)) {
    await Role.findOneAndUpdate(
      { key: roleKey },
      {
        $set: {
          name: ROLE_LABELS[roleKey],
          description: ROLE_DESCRIPTIONS[roleKey],
          isSystem: true,
        },
      },
      { upsert: true, returnDocument: "after" }
    )
  }

  const permissions = await Permission.find()
  const permissionMap = new Map(permissions.map((permission) => [permission.key, permission._id]))
  const roles = await Role.find()
  const roleMap = new Map(roles.map((role) => [role.key, role._id]))

  for (const [roleKey, permissionKeys] of Object.entries(ROLE_PERMISSION_MAP)) {
    const roleId = roleMap.get(roleKey as RoleKey)
    if (!roleId) continue

    const desiredPermissionIds = permissionKeys
      .map((permissionKey) => permissionMap.get(permissionKey))
      .filter((id): id is Types.ObjectId => Boolean(id))

    const existing = await RolePermission.find({ roleId }).lean()
    const existingIds = new Set(existing.map((row) => row.permissionId.toString()))
    const desiredIds = new Set(desiredPermissionIds.map((id) => id.toString()))

    const sameSize = existingIds.size === desiredIds.size
    const sameMembers = sameSize && [...desiredIds].every((id) => existingIds.has(id))
    if (sameMembers) continue

    await RolePermission.deleteMany({ roleId })

    if (desiredPermissionIds.length > 0) {
      await RolePermission.insertMany(
        desiredPermissionIds.map((permissionId) => ({ roleId, permissionId }))
      )
    }
  }

  logger.info("RBAC seed completed")
}

import { Types } from "mongoose"
import type { RoleKey } from "@/constants/roles"
import { Permission } from "@/modules/permissions/permission.model"
import { RolePermission } from "@/modules/roles/role-permission.model"
import { Role } from "@/modules/roles/role.model"

export async function getPermissionsForRole(roleId: Types.ObjectId): Promise<string[]> {
  const rolePermissions = await RolePermission.find({ roleId }).populate("permissionId")
  return rolePermissions
    .map((entry) => {
      const permission = entry.permissionId as unknown as { key?: string } | null
      return permission?.key
    })
    .filter((key): key is string => Boolean(key))
}

export async function getRoleByKey(roleKey: RoleKey) {
  return Role.findOne({ key: roleKey })
}

export async function roleHasPermission(
  roleId: Types.ObjectId,
  permissionKey: string
): Promise<boolean> {
  const permission = await Permission.findOne({ key: permissionKey })
  if (!permission) return false

  const mapping = await RolePermission.findOne({ roleId, permissionId: permission._id })
  return Boolean(mapping)
}

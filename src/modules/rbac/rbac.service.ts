import { Types } from "mongoose"
import { RolePermission } from "@/modules/roles/role-permission.model"

export async function getPermissionsForRole(roleId: Types.ObjectId): Promise<string[]> {
  const rolePermissions = await RolePermission.find({ roleId }).populate("permissionId")
  return rolePermissions
    .map((entry) => {
      const permission = entry.permissionId as unknown as { key?: string } | null
      return permission?.key
    })
    .filter((key): key is string => Boolean(key))
}

import { Types } from "mongoose"
import { Permission } from "@/modules/permissions/permission.model"
import { RolePermission } from "@/modules/roles/role-permission.model"

export async function getPermissionsForRole(roleId: Types.ObjectId): Promise<string[]> {
  // Ensure Permission model is registered before populate()
  void Permission

  const rolePermissions = await RolePermission.find({ roleId }).populate("permissionId")
  return rolePermissions
    .map((entry) => {
      const permission = entry.permissionId as unknown as { key?: string } | null
      return permission?.key
    })
    .filter((key): key is string => Boolean(key))
}

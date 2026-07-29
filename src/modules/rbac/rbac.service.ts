import { Types } from "mongoose"
import { ApiError } from "@/utils/api-error"
import { Permission } from "@/modules/permissions/permission.model"
import { Role } from "@/modules/roles/role.model"
import { RolePermission } from "@/modules/roles/role-permission.model"

export async function getPermissionsForRole(roleId: Types.ObjectId): Promise<string[]> {
  void Permission

  const rolePermissions = await RolePermission.find({ roleId }).populate("permissionId")
  return rolePermissions
    .map((entry) => {
      const permission = entry.permissionId as unknown as { key?: string } | null
      return permission?.key
    })
    .filter((key): key is string => Boolean(key))
}

export async function getRolesWithPermissions() {
  void Permission
  void Role

  const [roles, permissions, links] = await Promise.all([
    Role.find().sort({ name: 1 }).lean(),
    Permission.find().sort({ resource: 1, action: 1 }).lean(),
    RolePermission.find().lean(),
  ])

  const permissionIdsByRole = new Map<string, string[]>()
  for (const link of links) {
    const roleId = String(link.roleId)
    const list = permissionIdsByRole.get(roleId) ?? []
    list.push(String(link.permissionId))
    permissionIdsByRole.set(roleId, list)
  }

  return {
    roles: roles.map((role) => ({
      id: String(role._id),
      key: role.key,
      name: role.name,
      description: role.description,
      permissionIds: permissionIdsByRole.get(String(role._id)) ?? [],
    })),
    permissions: permissions.map((permission) => ({
      id: String(permission._id),
      key: permission.key,
      resource: permission.resource,
      action: permission.action,
      description: permission.description,
    })),
  }
}

export async function setRolePermissions(roleId: string, permissionIds: string[]) {
  if (!Types.ObjectId.isValid(roleId)) {
    throw new ApiError(400, "Invalid role id")
  }

  const role = await Role.findById(roleId)
  if (!role) {
    throw new ApiError(404, "Role not found")
  }

  const uniqueIds = [...new Set(permissionIds.filter((id) => Types.ObjectId.isValid(id)))]
  if (uniqueIds.length > 0) {
    const found = await Permission.countDocuments({ _id: { $in: uniqueIds } })
    if (found !== uniqueIds.length) {
      throw new ApiError(400, "One or more permissions are invalid")
    }
  }

  // Never strip admin's ability to manage roles — prevent lockout
  if (role.key === "admin") {
    const manageRoles = await Permission.findOne({ key: "roles:manage" })
    if (manageRoles && !uniqueIds.includes(String(manageRoles._id))) {
      uniqueIds.push(String(manageRoles._id))
    }
    const rolesRead = await Permission.findOne({ key: "roles:read" })
    if (rolesRead && !uniqueIds.includes(String(rolesRead._id))) {
      uniqueIds.push(String(rolesRead._id))
    }
  }

  await RolePermission.deleteMany({ roleId: role._id })

  if (uniqueIds.length > 0) {
    await RolePermission.insertMany(
      uniqueIds.map((permissionId) => ({
        roleId: role._id,
        permissionId: new Types.ObjectId(permissionId),
      }))
    )
  }

  const permissionKeys = await getPermissionsForRole(role._id)
  return {
    id: String(role._id),
    key: role.key,
    name: role.name,
    permissionIds: uniqueIds,
    permissions: permissionKeys,
  }
}

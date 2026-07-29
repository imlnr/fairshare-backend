import type { Request, Response } from "express"
import { asyncHandler } from "@/middleware/async-handler"
import { sendSuccess } from "@/utils/api-response"
import { Permission } from "@/modules/permissions/permission.model"
import { Role } from "@/modules/roles/role.model"
import { RolePermission } from "@/modules/roles/role-permission.model"
import {
  getRolesWithPermissions,
  setRolePermissions,
} from "@/modules/rbac/rbac.service"

export const rbacController = {
  listRoles: asyncHandler(async (_req: Request, res: Response) => {
    const roles = await Role.find().sort({ name: 1 })
    res.json(sendSuccess(roles, "Roles fetched successfully"))
  }),

  listPermissions: asyncHandler(async (_req: Request, res: Response) => {
    const permissions = await Permission.find().sort({ resource: 1, action: 1 })
    res.json(sendSuccess(permissions, "Permissions fetched successfully"))
  }),

  listRolePermissions: asyncHandler(async (_req: Request, res: Response) => {
    const rolePermissions = await RolePermission.find()
      .populate("roleId", "key name")
      .populate("permissionId", "key resource action description")

    res.json(sendSuccess(rolePermissions, "Role permissions fetched successfully"))
  }),

  getMatrix: asyncHandler(async (_req: Request, res: Response) => {
    const matrix = await getRolesWithPermissions()
    res.json(sendSuccess(matrix, "Role permission matrix fetched successfully"))
  }),

  updateRolePermissions: asyncHandler(async (req: Request, res: Response) => {
    const { permissionIds } = req.body as { permissionIds?: string[] }
    const result = await setRolePermissions(
      req.params.roleId as string,
      Array.isArray(permissionIds) ? permissionIds : []
    )
    res.json(sendSuccess(result, "Role permissions updated successfully"))
  }),
}

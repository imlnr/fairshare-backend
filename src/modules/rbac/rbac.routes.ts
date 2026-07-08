import { Router } from "express"
import { authenticate, authorize } from "@/middleware/authorize"
import { rbacController } from "@/modules/rbac/rbac.controller"

const rbacRoutes = Router()

rbacRoutes.use(authenticate)
rbacRoutes.get("/roles", authorize("roles:read"), rbacController.listRoles)
rbacRoutes.get("/permissions", authorize("roles:read"), rbacController.listPermissions)
rbacRoutes.get(
  "/role-permissions",
  authorize("roles:read"),
  rbacController.listRolePermissions
)

export { rbacRoutes }

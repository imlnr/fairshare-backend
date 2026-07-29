import { connectDatabase } from "@/config/database"
import { seedRbac } from "@/seeds/rbac.seed"
import { Permission } from "@/modules/permissions/permission.model"
import { Role } from "@/modules/roles/role.model"
import { RolePermission } from "@/modules/roles/role-permission.model"
import { getPermissionsForRole } from "@/modules/rbac/rbac.service"
import { ROLE_KEYS } from "@/constants/roles"

async function main() {
  await connectDatabase()
  await seedRbac()

  const permissions = await Permission.countDocuments()
  const roles = await Role.find().select("key name").lean()
  const links = await RolePermission.countDocuments()
  const admin = await Role.findOne({ key: ROLE_KEYS.ADMIN })
  const adminPerms = admin ? await getPermissionsForRole(admin._id) : []

  console.log({
    permissions,
    roles: roles.map((role) => ({ key: role.key, name: role.name })),
    rolePermissionLinks: links,
    adminPermissionCount: adminPerms.length,
    adminHasReportsRead: adminPerms.includes("reports:read"),
  })

  process.exit(0)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})

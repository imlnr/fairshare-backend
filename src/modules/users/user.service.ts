import bcrypt from "bcrypt"
import { ApiError } from "@/utils/api-error"
import { User } from "@/modules/users/user.model"
import { Role } from "@/modules/roles/role.model"
import { generateSecurePassword } from "@/utils/password"
import { sendCredentialsEmail } from "@/utils/email"
import type { RoleKey } from "@/constants/roles"

export const userService = {
  async createUserWithCredentials(input: {
    name: string
    email: string
    roleKey: RoleKey
    roleLabel: string
    password?: string
    sendEmail?: boolean
  }) {
    const email = input.email.toLowerCase().trim()
    const existing = await User.findOne({ email })
    if (existing) {
      throw new ApiError(409, "A user with this email already exists")
    }

    const role = await Role.findOne({ key: input.roleKey })
    if (!role) {
      throw new ApiError(500, `${input.roleLabel} role is not configured`)
    }

    const plainPassword = input.password ?? generateSecurePassword()
    const hashedPassword = await bcrypt.hash(plainPassword, 12)

    const user = await User.create({
      name: input.name.trim(),
      email,
      password: hashedPassword,
      authProvider: "local",
      roleId: role._id,
      isEmailVerified: true,
    })

    if (input.sendEmail !== false) {
      await sendCredentialsEmail({
        to: email,
        name: user.name,
        password: plainPassword,
        roleLabel: input.roleLabel,
      })
    }

    return user
  },
}

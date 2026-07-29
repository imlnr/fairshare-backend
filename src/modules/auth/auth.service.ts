import { Types } from "mongoose"
import bcrypt from "bcrypt"
import jwt from "jsonwebtoken"
import { env } from "@/config/env"
import { ApiError } from "@/utils/api-error"
import { fetchGoogleProfile, exchangeGoogleAuthCode } from "@/modules/auth/google-oauth"
import { getPermissionsForRole } from "@/modules/rbac/rbac.service"
import { User, type AuthProvider } from "@/modules/users/user.model"
import type {
  AuthResult,
  GoogleAuthInput,
  LoginInput,
  SafeUser,
} from "@/modules/auth/auth.types"
import type { AuthenticatedUser } from "@/types/express"

type PopulatedUser = {
  _id: { toString(): string }
  name: string
  email: string
  image?: string
  authProvider: AuthProvider
  roleId: {
    _id: { toString(): string }
    key: string
    name: string
  }
  isActive: boolean
  isEmailVerified: boolean
  lastLoginAt?: Date
  createdAt: Date
  updatedAt: Date
}

async function toSafeUser(user: PopulatedUser, permissions: string[]): Promise<SafeUser> {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    image: user.image,
    authProvider: user.authProvider,
    role: {
      id: user.roleId._id.toString(),
      key: user.roleId.key,
      name: user.roleId.name,
    },
    permissions,
    isActive: user.isActive,
    isEmailVerified: user.isEmailVerified,
    lastLoginAt: user.lastLoginAt,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  }
}

async function getPopulatedUser(userId: string) {
  const user = await User.findById(userId).populate("roleId")
  if (!user || !user.roleId || typeof user.roleId === "string") {
    throw new ApiError(404, "User not found")
  }
  return user as unknown as PopulatedUser
}

function signToken(userId: string): string {
  return jwt.sign({ sub: userId }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn,
  } as jwt.SignOptions)
}

async function buildAuthResult(user: PopulatedUser): Promise<AuthResult> {
  const permissions = await getPermissionsForRole(new Types.ObjectId(user.roleId._id.toString()))
  return {
    user: await toSafeUser(user, permissions),
    tokens: { accessToken: signToken(user._id.toString()) },
  }
}

export const authService = {
  async login(input: LoginInput): Promise<AuthResult> {
    const email = input.email.trim().toLowerCase()
    const user = await User.findOne({ email }).select("+password").populate("roleId")
    if (!user || !user.password) {
      throw new ApiError(401, "Invalid email or password")
    }

    if (!user.isActive) {
      throw new ApiError(403, "Your account has been deactivated")
    }

    const isPasswordValid = await bcrypt.compare(input.password, user.password)
    if (!isPasswordValid) {
      throw new ApiError(401, "Invalid email or password")
    }

    user.lastLoginAt = new Date()
    await user.save()

    const populatedUser = await getPopulatedUser(user._id.toString())
    return buildAuthResult(populatedUser)
  },

  async loginWithGoogle(input: GoogleAuthInput): Promise<AuthResult> {
    let payload

    try {
      if (input.code?.trim()) {
        if (!env.googleClientSecret) {
          throw new ApiError(500, "Google client secret is not configured on the server")
        }
        if (!input.redirectUri?.trim()) {
          throw new ApiError(400, "redirectUri is required for Google auth code login")
        }
        const { accessToken } = await exchangeGoogleAuthCode(
          input.code.trim(),
          input.redirectUri.trim(),
          env.googleClientId,
          env.googleClientSecret
        )
        payload = await fetchGoogleProfile(accessToken)
      } else if (input.accessToken?.trim()) {
        payload = await fetchGoogleProfile(input.accessToken.trim())
      } else {
        throw new ApiError(400, "Google credential is required")
      }
    } catch (error) {
      if (error instanceof ApiError) throw error
      const message = error instanceof Error ? error.message : "Invalid Google credential"
      throw new ApiError(401, message)
    }

    const user = await User.findOne({
      $or: [{ googleId: payload.sub }, { email: payload.email.toLowerCase() }],
    })

    if (!user) {
      throw new ApiError(
        403,
        "No account found for this Google email. Request access or contact your room manager."
      )
    }

    user.name = payload.name ?? user.name
    user.image = payload.picture ?? user.image
    user.googleId = payload.sub
    user.googleEmail = payload.email.toLowerCase()
    user.isEmailVerified = payload.email_verified ?? user.isEmailVerified
    user.lastLoginAt = new Date()

    if (user.authProvider === "local" && user.password) {
      user.authProvider = "both"
    } else if (user.authProvider !== "both") {
      user.authProvider = "google"
    }

    await user.save()

    if (!user.isActive) {
      throw new ApiError(403, "Your account has been deactivated")
    }

    const populatedUser = await getPopulatedUser(user._id.toString())
    return buildAuthResult(populatedUser)
  },

  async getAuthContext(userId: string): Promise<AuthenticatedUser> {
    const user = await getPopulatedUser(userId)
    const permissions = await getPermissionsForRole(new Types.ObjectId(user.roleId._id.toString()))

    return {
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      image: user.image,
      role: {
        id: user.roleId._id.toString(),
        key: user.roleId.key,
        name: user.roleId.name,
      },
      permissions,
    }
  },

  async getProfile(userId: string): Promise<SafeUser> {
    const user = await getPopulatedUser(userId)
    const permissions = await getPermissionsForRole(new Types.ObjectId(user.roleId._id.toString()))
    return toSafeUser(user, permissions)
  },
}

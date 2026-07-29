import type { AuthProvider } from "@/modules/users/user.model"

export type LoginInput = {
  email: string
  password: string
}

export type GoogleAuthInput = {
  /** Legacy implicit / token popup flow */
  accessToken?: string
  /** Auth-code redirect flow (preferred for production) */
  code?: string
  redirectUri?: string
}

export type AuthTokens = {
  accessToken: string
}

export type SafeUser = {
  id: string
  name: string
  email: string
  image?: string
  authProvider: AuthProvider
  role: {
    id: string
    key: string
    name: string
  }
  permissions: string[]
  isActive: boolean
  isEmailVerified: boolean
  lastLoginAt?: Date
  createdAt: Date
  updatedAt: Date
}

export type AuthResult = {
  user: SafeUser
  tokens: AuthTokens
}

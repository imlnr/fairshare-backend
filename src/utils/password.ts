import crypto from "crypto"

export function generateSecurePassword(length = 12): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%"
  const bytes = crypto.randomBytes(length)
  let password = ""
  for (let i = 0; i < length; i++) {
    password += chars[bytes[i]! % chars.length]
  }
  return password
}

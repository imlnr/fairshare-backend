type GoogleUserInfo = {
  id?: string
  sub?: string
  email?: string
  verified_email?: boolean
  email_verified?: boolean
  name?: string
  picture?: string
}

export type GoogleProfile = {
  sub: string
  email: string
  email_verified?: boolean
  name?: string
  picture?: string
}

/**
 * Resolve Google user profile from an access token using plain HTTPS.
 * No Google client libraries.
 */
export async function fetchGoogleProfile(accessToken: string): Promise<GoogleProfile> {
  const response = await fetch(
    `https://www.googleapis.com/oauth2/v3/userinfo?access_token=${encodeURIComponent(accessToken)}`
  )

  if (!response.ok) {
    throw new Error("Failed to fetch Google user profile")
  }

  const data = (await response.json()) as GoogleUserInfo
  const sub = data.sub || data.id
  const email = data.email

  if (!sub || !email) {
    throw new Error("Google profile is incomplete")
  }

  return {
    sub,
    email,
    email_verified: data.email_verified ?? data.verified_email,
    name: data.name,
    picture: data.picture,
  }
}

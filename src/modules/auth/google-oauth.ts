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

type GoogleTokenResponse = {
  access_token?: string
  id_token?: string
  error?: string
  error_description?: string
}

/** Exchange an authorization code (redirect flow) for Google tokens. */
export async function exchangeGoogleAuthCode(
  code: string,
  redirectUri: string,
  clientId: string,
  clientSecret: string
): Promise<{ accessToken: string }> {
  const body = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
  })

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  })

  const data = (await response.json()) as GoogleTokenResponse

  if (!response.ok || !data.access_token) {
    throw new Error(data.error_description || data.error || "Failed to exchange Google auth code")
  }

  return { accessToken: data.access_token }
}

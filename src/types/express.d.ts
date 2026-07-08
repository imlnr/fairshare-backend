export type AuthenticatedUser = {
  id: string
  email: string
  name: string
  image?: string
  role: {
    id: string
    key: string
    name: string
  }
  permissions: string[]
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser
    }
  }
}

export {}

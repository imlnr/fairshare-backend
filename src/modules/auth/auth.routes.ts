import { Router } from "express"
import { authController } from "@/modules/auth/auth.controller"
import { authenticate } from "@/middleware/authorize"
import { authRateLimiter } from "@/middleware/rate-limit"

const authRoutes = Router()

authRoutes.post("/login", authRateLimiter, authController.login)
authRoutes.post("/google", authRateLimiter, authController.googleLogin)
authRoutes.get("/me", authenticate, authController.getMe)

export { authRoutes }

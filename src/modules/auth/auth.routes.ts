import { Router } from "express"
import { authController } from "@/modules/auth/auth.controller"
import { authenticate } from "@/middleware/authorize"

const authRoutes = Router()

authRoutes.post("/login", authController.login)
authRoutes.post("/google", authController.googleLogin)
authRoutes.get("/me", authenticate, authController.getMe)

export { authRoutes }

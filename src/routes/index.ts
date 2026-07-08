import { Router } from "express"
import { authRoutes } from "@/modules/auth/auth.routes"
import { healthRoutes } from "@/modules/health/health.routes"
import { rbacRoutes } from "@/modules/rbac/rbac.routes"
import { roomRoutes } from "@/modules/rooms/room.routes"

const apiRoutes = Router()

apiRoutes.use("/health", healthRoutes)
apiRoutes.use("/auth", authRoutes)
apiRoutes.use("/rbac", rbacRoutes)
apiRoutes.use("/rooms", roomRoutes)

export { apiRoutes }

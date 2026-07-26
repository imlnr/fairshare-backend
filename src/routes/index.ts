import { Router } from "express"
import { authRoutes } from "@/modules/auth/auth.routes"
import { healthRoutes } from "@/modules/health/health.routes"
import { rbacRoutes } from "@/modules/rbac/rbac.routes"
import { roomRoutes } from "@/modules/rooms/room.routes"
import { joinRequestRoutes } from "@/modules/join-requests/join-request.routes"
import { dashboardRoutes } from "@/modules/dashboard/dashboard.routes"

const apiRoutes = Router()

apiRoutes.use("/health", healthRoutes)
apiRoutes.use("/auth", authRoutes)
apiRoutes.use("/rbac", rbacRoutes)
apiRoutes.use("/rooms", roomRoutes)
apiRoutes.use("/dashboard", dashboardRoutes)
apiRoutes.use("/join", joinRequestRoutes)
apiRoutes.use("/join-requests", joinRequestRoutes)

export { apiRoutes }

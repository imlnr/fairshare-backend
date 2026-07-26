import { Router } from "express"
import { authenticate, authorize } from "@/middleware/authorize"
import { dashboardController } from "@/modules/dashboard/dashboard.controller"

const dashboardRoutes = Router()

dashboardRoutes.get(
  "/",
  authenticate,
  authorize("reports:read"),
  dashboardController.getDashboard
)

export { dashboardRoutes }

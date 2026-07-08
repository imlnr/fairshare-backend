import { Router } from "express"
import { healthController } from "@/modules/health/health.controller"

const healthRoutes = Router()

healthRoutes.get("/", healthController.getHealth)

export { healthRoutes }

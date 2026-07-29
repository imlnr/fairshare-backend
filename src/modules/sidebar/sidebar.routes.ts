import { Router } from "express"
import { authenticate, authorize } from "@/middleware/authorize"
import { sidebarController } from "@/modules/sidebar/sidebar.controller"

const sidebarRoutes = Router()

sidebarRoutes.use(authenticate)

sidebarRoutes.get("/me", authorize("sidebar:read"), sidebarController.getMine)
sidebarRoutes.get("/", authorize("sidebar:manage"), sidebarController.list)
sidebarRoutes.post("/", authorize("sidebar:manage"), sidebarController.create)
sidebarRoutes.patch("/reorder", authorize("sidebar:manage"), sidebarController.reorder)
sidebarRoutes.patch("/:id", authorize("sidebar:manage"), sidebarController.update)
sidebarRoutes.delete("/:id", authorize("sidebar:manage"), sidebarController.remove)

export { sidebarRoutes }

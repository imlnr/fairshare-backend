import { Router } from "express"
import { authenticate, authorize } from "@/middleware/authorize"
import { joinRateLimiter } from "@/middleware/rate-limit"
import { joinRequestController } from "@/modules/join-requests/join-request.controller"

const joinRequestRoutes = Router()

joinRequestRoutes.post("/room-manager", joinRateLimiter, joinRequestController.submit)

joinRequestRoutes.get(
  "/",
  authenticate,
  authorize("join_requests:read"),
  joinRequestController.list
)

joinRequestRoutes.post(
  "/:id/approve",
  authenticate,
  authorize("join_requests:review"),
  joinRequestController.approve
)

joinRequestRoutes.post(
  "/:id/reject",
  authenticate,
  authorize("join_requests:review"),
  joinRequestController.reject
)

export { joinRequestRoutes }

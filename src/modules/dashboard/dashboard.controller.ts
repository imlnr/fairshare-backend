import type { Request, Response } from "express"
import { asyncHandler } from "@/middleware/async-handler"
import { ApiResponse } from "@/utils/api-response"
import { dashboardService } from "@/modules/dashboard/dashboard.service"

export const dashboardController = {
  getDashboard: asyncHandler(async (req: Request, res: Response) => {
    const data = await dashboardService.getDashboard(req.user!, {
      range: req.query["range"],
      roomId: req.query["roomId"],
    })
    res.json(ApiResponse.success(data))
  }),
}

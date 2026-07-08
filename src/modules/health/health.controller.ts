import type { Request, Response } from "express"
import { asyncHandler } from "@/middleware/async-handler"
import { sendSuccess } from "@/utils/api-response"

export const healthController = {
  getHealth: asyncHandler(async (_req: Request, res: Response) => {
    res.json(
      sendSuccess(
        {
          status: "ok",
          timestamp: new Date().toISOString(),
          uptime: process.uptime(),
        },
        "Service is healthy"
      )
    )
  }),
}

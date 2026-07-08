import type { Request, Response } from "express"
import { ApiError } from "@/utils/api-error"
import { sendError } from "@/utils/api-response"
import { env } from "@/config/env"
import { logger } from "@/utils/logger"

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json(sendError(`Route not found: ${req.method} ${req.originalUrl}`))
}

export function errorHandler(err: unknown, _req: Request, res: Response): void {
  if (err instanceof ApiError) {
    res.status(err.statusCode).json(sendError(err.message))
    return
  }

  logger.error("Unhandled error", {
    error: err instanceof Error ? err.message : err,
  })

  res.status(500).json(
    sendError(
      env.isProduction
        ? "Internal server error"
        : err instanceof Error
          ? err.message
          : "Unknown error"
    )
  )
}

import type { NextFunction, Request, Response } from "express"
import { ApiError } from "@/utils/api-error"
import { sendError } from "@/utils/api-response"
import { env } from "@/config/env"
import { logger } from "@/utils/logger"

function getRequestMeta(req: Request) {
  return {
    method: req.method,
    url: req.originalUrl,
    path: req.path,
    ip: req.ip,
    userId: req.user?.id,
    role: req.user?.role.key,
  }
}

export function notFoundHandler(req: Request, res: Response): void {
  logger.warn("Route not found", getRequestMeta(req))

  res.status(404).json(sendError(`Route not found: ${req.method} ${req.originalUrl}`))
}

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const requestMeta = getRequestMeta(req)

  if (err instanceof ApiError) {
    const level = err.statusCode >= 500 ? "error" : "warn"

    logger[level](err.message, {
      ...requestMeta,
      statusCode: err.statusCode,
      type: "ApiError",
    })

    res.status(err.statusCode).json(sendError(err.message))
    return
  }

  logger.error("Unhandled error", {
    ...requestMeta,
    statusCode: 500,
    type: err instanceof Error ? err.name : "UnknownError",
    error: err instanceof Error ? err.message : err,
    stack: err instanceof Error ? err.stack : undefined,
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

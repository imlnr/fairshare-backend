import cors from "cors"
import express from "express"
import { env } from "@/config/env"
import { errorHandler, notFoundHandler } from "@/middleware/error-handler"
import { apiRoutes } from "@/routes/index"

export function createApp() {
  const app = express()

  app.use(
    cors({
      origin: env.corsOrigin,
      credentials: true,
    })
  )
  app.use(express.json())
  app.use(express.urlencoded({ extended: true }))

  app.get("/", (_req, res) => {
    res.json({ success: true, message: "Spending Calc API" })
  })

  app.use("/api", apiRoutes)
  app.use(notFoundHandler)
  app.use(errorHandler)

  return app
}

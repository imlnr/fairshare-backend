import cors from "cors"
import express from "express"
import { env } from "@/config/env"
import { errorHandler, notFoundHandler } from "@/middleware/error-handler"
import { requestLogger } from "@/middleware/request-logger"
import { apiRoutes } from "@/routes/index"
import { renderWelcomePage } from "@/views/welcome-page"

export function createApp() {
  const app = express()

  app.set("trust proxy", 1)

  app.use(
    cors({
      origin: env.corsOrigin,
      credentials: true,
    })
  )
  app.use(express.json())
  app.use(express.urlencoded({ extended: true }))
  app.use(requestLogger)

  app.get("/", (_req, res) => {
    res.type("html").send(renderWelcomePage())
  })

  app.use("/api", apiRoutes)
  app.use(notFoundHandler)
  app.use(errorHandler)

  return app
}

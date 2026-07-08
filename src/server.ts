import { env } from "@/config/env"
import { getApplication } from "@/bootstrap"
import { logger } from "@/utils/logger"

async function startServer() {
  const app = await getApplication()

  app.listen(env.port, () => {
    logger.info(`Server running on http://localhost:${env.port}`)
  })
}

startServer().catch((error) => {
  logger.error("Failed to start server", {
    error: error instanceof Error ? error.message : error,
  })
  process.exit(1)
})

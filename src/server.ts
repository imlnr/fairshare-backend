import { createApp } from "@/app"
import { connectDatabase } from "@/config/database"
import { env } from "@/config/env"
import { seedRbac } from "@/seeds/rbac.seed"
import { seedEmailTemplates } from "@/seeds/email-templates.seed"
import { backfillRoomManagers } from "@/seeds/room-managers-backfill.seed"
import { logger } from "@/utils/logger"

async function startServer() {
  await connectDatabase()
  await seedRbac()
  await seedEmailTemplates()
  await backfillRoomManagers()

  const app = createApp()

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

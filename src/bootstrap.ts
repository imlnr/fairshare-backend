import type { Express } from "express"
import { createApp } from "@/app"
import { connectDatabase } from "@/config/database"
import { seedRbac } from "@/seeds/rbac.seed"
import { seedEmailTemplates } from "@/seeds/email-templates.seed"
import { seedSidebarMenu } from "@/seeds/sidebar.seed"
import { backfillRoomManagers } from "@/seeds/room-managers-backfill.seed"
import { logger } from "@/utils/logger"

let bootstrapPromise: Promise<Express> | null = null

export function getApplication(): Promise<Express> {
  if (!bootstrapPromise) {
    bootstrapPromise = (async () => {
      await connectDatabase()
      await seedRbac()
      await seedEmailTemplates()
      await seedSidebarMenu()
      await backfillRoomManagers()
      logger.info("Application bootstrap complete")
      return createApp()
    })().catch((error) => {
      bootstrapPromise = null
      throw error
    })
  }

  return bootstrapPromise
}

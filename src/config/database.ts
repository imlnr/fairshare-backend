import mongoose from "mongoose"
import { env } from "@/config/env"
import { logger } from "@/utils/logger"

type MongooseCache = {
  conn: typeof mongoose | null
  promise: Promise<typeof mongoose> | null
}

declare global {
  // eslint-disable-next-line no-var
  var mongooseCache: MongooseCache | undefined
}

const cache: MongooseCache = global.mongooseCache ?? {
  conn: null,
  promise: null,
}

global.mongooseCache = cache

export async function connectDatabase(): Promise<void> {
  if (cache.conn) {
    return
  }

  mongoose.set("strictQuery", true)

  if (!cache.promise) {
    cache.promise = mongoose.connect(env.mongodbUri).then((connection) => {
      logger.info("MongoDB connected")
      return connection
    })
  }

  cache.conn = await cache.promise
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect()
  logger.info("MongoDB disconnected")
}

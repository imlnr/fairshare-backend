import winston from "winston"
import { env } from "@/config/env"

const { combine, timestamp, json, colorize, printf, errors } = winston.format

const devFormat = combine(
  colorize(),
  timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  errors({ stack: true }),
  printf(({ level, message, timestamp: ts, ...meta }) => {
    const rest = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : ""
    return `${ts} [${level}] ${message}${rest}`
  })
)

const prodFormat = combine(timestamp(), errors({ stack: true }), json())

export const logger = winston.createLogger({
  level: env.logLevel,
  format: env.isProduction ? prodFormat : devFormat,
  transports: [new winston.transports.Console()],
  defaultMeta: { service: "spending-calc-api" },
})

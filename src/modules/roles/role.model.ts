import { Schema, model, type InferSchemaType } from "mongoose"
import { ROLE_KEYS, type RoleKey } from "@/constants/roles"

const roleSchema = new Schema(
  {
    key: {
      type: String,
      enum: Object.values(ROLE_KEYS),
      required: true,
      unique: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    isSystem: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
)

export type RoleDocument = InferSchemaType<typeof roleSchema> & { key: RoleKey }

export const Role = model("Role", roleSchema)

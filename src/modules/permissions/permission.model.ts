import { Schema, model, type InferSchemaType } from "mongoose"

const permissionSchema = new Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    resource: {
      type: String,
      required: true,
      trim: true,
    },
    action: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
)

export type PermissionDocument = InferSchemaType<typeof permissionSchema>

export const Permission = model("Permission", permissionSchema)

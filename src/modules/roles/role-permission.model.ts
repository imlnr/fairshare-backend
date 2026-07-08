import { Schema, model, type InferSchemaType, Types } from "mongoose"

const rolePermissionSchema = new Schema(
  {
    roleId: {
      type: Types.ObjectId,
      ref: "Role",
      required: true,
      index: true,
    },
    permissionId: {
      type: Types.ObjectId,
      ref: "Permission",
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
)

rolePermissionSchema.index({ roleId: 1, permissionId: 1 }, { unique: true })

export type RolePermissionDocument = InferSchemaType<typeof rolePermissionSchema>

export const RolePermission = model("RolePermission", rolePermissionSchema)

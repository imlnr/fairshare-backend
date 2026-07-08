import { Schema, model, type InferSchemaType, Types } from "mongoose"

export const JOIN_REQUEST_STATUSES = ["pending", "approved", "rejected"] as const
export type JoinRequestStatus = (typeof JOIN_REQUEST_STATUSES)[number]

const roomManagerRequestSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    organization: {
      type: String,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: JOIN_REQUEST_STATUSES,
      default: "pending",
      index: true,
    },
    reviewedBy: {
      type: Types.ObjectId,
      ref: "User",
    },
    reviewedAt: {
      type: Date,
    },
    adminNotes: {
      type: String,
      trim: true,
    },
    createdUserId: {
      type: Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
)

export type RoomManagerRequestDocument = InferSchemaType<typeof roomManagerRequestSchema>
export const RoomManagerRequest = model("RoomManagerRequest", roomManagerRequestSchema)

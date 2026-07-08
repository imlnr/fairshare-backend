import { Schema, model, type InferSchemaType, Types } from "mongoose"

const roomMemberSchema = new Schema(
  {
    roomId: {
      type: Types.ObjectId,
      ref: "Room",
      required: true,
      index: true,
    },
    userId: {
      type: Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
    leftAt: {
      type: Date,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
)

roomMemberSchema.index({ roomId: 1, userId: 1 }, { unique: true })

export type RoomMemberDocument = InferSchemaType<typeof roomMemberSchema>
export const RoomMember = model("RoomMember", roomMemberSchema)

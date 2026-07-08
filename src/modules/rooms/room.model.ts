import { Schema, model, type InferSchemaType, Types } from "mongoose"

const roomSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    image: {
      type: String,
      trim: true,
    },
    managerId: {
      type: Types.ObjectId,
      ref: "User",
      index: true,
    },
    createdBy: {
      type: Types.ObjectId,
      ref: "User",
      required: true,
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

export type RoomDocument = InferSchemaType<typeof roomSchema>
export const Room = model("Room", roomSchema)

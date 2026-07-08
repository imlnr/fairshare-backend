import { Schema, model, type InferSchemaType, Types } from "mongoose"

const paymentSchema = new Schema(
  {
    billId: {
      type: Types.ObjectId,
      ref: "Bill",
      required: true,
      index: true,
    },
    roomId: {
      type: Types.ObjectId,
      ref: "Room",
      required: true,
      index: true,
    },
    payerId: {
      type: Types.ObjectId,
      ref: "User",
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0.01,
    },
    recordedBy: {
      type: Types.ObjectId,
      ref: "User",
      required: true,
    },
    notes: {
      type: String,
      trim: true,
    },
    paidAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
)

export type PaymentDocument = InferSchemaType<typeof paymentSchema>
export const Payment = model("Payment", paymentSchema)

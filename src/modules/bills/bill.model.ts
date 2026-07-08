import { Schema, model, type InferSchemaType, Types } from "mongoose"

export const BILL_STATUSES = ["draft", "locked"] as const
export type BillStatus = (typeof BILL_STATUSES)[number]

export const SETTLEMENT_STATUSES = ["pending", "partial", "settled"] as const
export type SettlementStatus = (typeof SETTLEMENT_STATUSES)[number]

const memberSummarySchema = new Schema(
  {
    userId: { type: Types.ObjectId, ref: "User", required: true },
    currentShare: { type: Number, required: true, default: 0 },
    previousPending: { type: Number, required: true, default: 0 },
    paymentsReceived: { type: Number, required: true, default: 0 },
    netPaidFor: { type: Number, required: true, default: 0 },
    finalAmount: { type: Number, required: true, default: 0 },
    settlementStatus: {
      type: String,
      enum: SETTLEMENT_STATUSES,
      default: "pending",
    },
  },
  { _id: false }
)

const billSchema = new Schema(
  {
    roomId: {
      type: Types.ObjectId,
      ref: "Room",
      required: true,
      index: true,
    },
    period: {
      type: String,
      required: true,
      match: /^\d{4}-\d{2}$/,
    },
    version: {
      type: Number,
      default: 1,
    },
    status: {
      type: String,
      enum: BILL_STATUSES,
      default: "draft",
    },
    generatedAt: {
      type: Date,
    },
    generatedBy: {
      type: Types.ObjectId,
      ref: "User",
    },
    memberSummaries: {
      type: [memberSummarySchema],
      default: [],
    },
    lockedExpenseIds: {
      type: [Types.ObjectId],
      default: [],
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
)

billSchema.index({ roomId: 1, period: 1 })

export type MemberSummaryDocument = InferSchemaType<typeof memberSummarySchema>
export type BillDocument = InferSchemaType<typeof billSchema>
export const Bill = model("Bill", billSchema)

import { Schema, model, type InferSchemaType, Types } from "mongoose"

const memberShareSchema = new Schema(
  {
    userId: {
      type: Types.ObjectId,
      ref: "User",
      required: true,
    },
    share: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: false }
)

const expenseSchema = new Schema(
  {
    roomId: {
      type: Types.ObjectId,
      ref: "Room",
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0.01,
    },
    description: {
      type: String,
      trim: true,
    },
    date: {
      type: Date,
      required: true,
    },
    paidByUserId: {
      type: Types.ObjectId,
      ref: "User",
      default: null,
    },
    presentMemberIds: {
      type: [Types.ObjectId],
      required: true,
      validate: {
        validator: (arr: Types.ObjectId[]) => arr.length >= 1,
        message: "At least one member must be present for an expense",
      },
    },
    /** Backend-computed equal split for each present member */
    memberShares: {
      type: [memberShareSchema],
      default: [],
    },
    billPeriod: {
      type: String,
      required: true,
      match: /^\d{4}-\d{2}$/,
    },
    isLocked: {
      type: Boolean,
      default: false,
      index: true,
    },
    createdBy: {
      type: Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
)

expenseSchema.index({ roomId: 1, billPeriod: 1 })

export type ExpenseDocument = InferSchemaType<typeof expenseSchema>
export const Expense = model("Expense", expenseSchema)

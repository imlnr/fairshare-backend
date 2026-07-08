import { Schema, model, type InferSchemaType, Types } from "mongoose"

export const AUTH_PROVIDERS = ["local", "google", "both"] as const
export type AuthProvider = (typeof AUTH_PROVIDERS)[number]

const userSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      select: false,
      minlength: 8,
    },
    image: {
      type: String,
      trim: true,
    },
    googleId: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },
    googleEmail: {
      type: String,
      lowercase: true,
      trim: true,
    },
    authProvider: {
      type: String,
      enum: AUTH_PROVIDERS,
      default: "local",
    },
    roleId: {
      type: Types.ObjectId,
      ref: "Role",
      required: true,
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    lastLoginAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
)

export type UserDocument = InferSchemaType<typeof userSchema>

export const User = model("User", userSchema)

import { Schema, model, type InferSchemaType } from "mongoose"
import { ROLE_KEYS } from "@/constants/roles"

export const SIDEBAR_ACCESS_LEVELS = ["none", "view", "read", "write"] as const
export type SidebarAccessLevel = (typeof SIDEBAR_ACCESS_LEVELS)[number]

export const SIDEBAR_SECTIONS = ["main", "admin", "secondary"] as const
export type SidebarSection = (typeof SIDEBAR_SECTIONS)[number]

const roleAccessSchema = new Schema(
  {
    admin: {
      type: String,
      enum: SIDEBAR_ACCESS_LEVELS,
      default: "none",
    },
    room_manager: {
      type: String,
      enum: SIDEBAR_ACCESS_LEVELS,
      default: "none",
    },
    member: {
      type: String,
      enum: SIDEBAR_ACCESS_LEVELS,
      default: "none",
    },
    viewer: {
      type: String,
      enum: SIDEBAR_ACCESS_LEVELS,
      default: "none",
    },
  },
  { _id: false }
)

const sidebarMenuItemSchema = new Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    path: {
      type: String,
      required: true,
      trim: true,
    },
    iconName: {
      type: String,
      required: true,
      trim: true,
    },
    section: {
      type: String,
      enum: SIDEBAR_SECTIONS,
      required: true,
      default: "main",
    },
    parentKey: {
      type: String,
      default: null,
      trim: true,
    },
    sortOrder: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isSystem: {
      type: Boolean,
      default: false,
    },
    requiredPermission: {
      type: String,
      default: null,
      trim: true,
    },
    roleAccess: {
      type: roleAccessSchema,
      required: true,
      default: () => ({
        admin: "none",
        room_manager: "none",
        member: "none",
        viewer: "none",
      }),
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
)

sidebarMenuItemSchema.index({ section: 1, sortOrder: 1 })
sidebarMenuItemSchema.index({ parentKey: 1, sortOrder: 1 })

export type SidebarMenuItemDocument = InferSchemaType<typeof sidebarMenuItemSchema>

export type SidebarRoleAccess = {
  [K in (typeof ROLE_KEYS)[keyof typeof ROLE_KEYS]]: SidebarAccessLevel
}

export const SidebarMenuItem = model("SidebarMenuItem", sidebarMenuItemSchema)

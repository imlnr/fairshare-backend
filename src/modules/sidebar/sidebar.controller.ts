import type { Request, Response } from "express"
import { asyncHandler } from "@/middleware/async-handler"
import { ApiResponse } from "@/utils/api-response"
import {
  sidebarService,
  type CreateSidebarItemInput,
  type UpdateSidebarItemInput,
} from "@/modules/sidebar/sidebar.service"

export const sidebarController = {
  getMine: asyncHandler(async (req: Request, res: Response) => {
    const menu = await sidebarService.getMenuForUser(req.user!)
    res.json(ApiResponse.success(menu))
  }),

  list: asyncHandler(async (_req: Request, res: Response) => {
    const items = await sidebarService.listAll()
    res.json(ApiResponse.success(items))
  }),

  create: asyncHandler(async (req: Request, res: Response) => {
    const item = await sidebarService.create(req.body as CreateSidebarItemInput)
    res.status(201).json(ApiResponse.success(item, "Sidebar item created"))
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    const item = await sidebarService.update(
      req.params.id as string,
      req.body as UpdateSidebarItemInput
    )
    res.json(ApiResponse.success(item, "Sidebar item updated"))
  }),

  remove: asyncHandler(async (req: Request, res: Response) => {
    const result = await sidebarService.remove(req.params.id as string)
    res.json(ApiResponse.success(result, "Sidebar item removed"))
  }),

  reorder: asyncHandler(async (req: Request, res: Response) => {
    const { items } = req.body as { items?: Array<{ id: string; sortOrder: number }> }
    const result = await sidebarService.reorder(items ?? [])
    res.json(ApiResponse.success(result, "Sidebar order updated"))
  }),
}

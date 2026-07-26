import type { Request, Response } from "express"
import { asyncHandler } from "@/middleware/async-handler"
import { ApiResponse } from "@/utils/api-response"
import { billService } from "@/modules/bills/bill.service"

export const billController = {
  listBills: asyncHandler(async (req: Request, res: Response) => {
    const bills = await billService.listBills(req.params["roomId"] as string, req.user!)
    res.json(ApiResponse.success(bills))
  }),

  generateBill: asyncHandler(async (req: Request, res: Response) => {
    const { period } = req.body as { period: string }
    const bill = await billService.generateBill(
      req.params["roomId"] as string,
      period,
      req.user!.id
    )
    res.status(201).json(ApiResponse.success(bill, `Bill generated for ${period}`))
  }),

  getBill: asyncHandler(async (req: Request, res: Response) => {
    const bill = await billService.getBill(
      req.params["roomId"] as string,
      req.params["billId"] as string,
      req.user!
    )
    res.json(ApiResponse.success(bill))
  }),

  reopenBill: asyncHandler(async (req: Request, res: Response) => {
    const bill = await billService.reopenBill(
      req.params["roomId"] as string,
      req.params["billId"] as string
    )
    res.json(ApiResponse.success(bill, "Bill reopened"))
  }),
}

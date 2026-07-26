import type { Request, Response } from "express"
import { asyncHandler } from "@/middleware/async-handler"
import { ApiResponse } from "@/utils/api-response"
import { paymentService } from "@/modules/payments/payment.service"

export const paymentController = {
  listPayments: asyncHandler(async (req: Request, res: Response) => {
    const payments = await paymentService.listPayments(
      req.params["roomId"] as string,
      req.params["billId"] as string
    )
    res.json(ApiResponse.success(payments))
  }),

  recordPayment: asyncHandler(async (req: Request, res: Response) => {
    const payment = await paymentService.recordPayment(
      req.params["billId"] as string,
      req.params["roomId"] as string,
      req.body as Parameters<typeof paymentService.recordPayment>[2],
      req.user!.id
    )
    res.status(201).json(ApiResponse.success(payment, "Payment recorded"))
  }),
}

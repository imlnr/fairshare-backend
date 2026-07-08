import type { Request, Response } from "express"
import { asyncHandler } from "@/middleware/async-handler"
import { ApiResponse } from "@/utils/api-response"
import { joinRequestService } from "@/modules/join-requests/join-request.service"
import type { JoinRequestStatus } from "@/modules/join-requests/room-manager-request.model"

export const joinRequestController = {
  submit: asyncHandler(async (req: Request, res: Response) => {
    const request = await joinRequestService.submitRequest(
      req.body as Parameters<typeof joinRequestService.submitRequest>[0]
    )
    res.status(201).json(
      ApiResponse.success(
        request,
        "Your request has been submitted. You will receive login credentials by email once approved."
      )
    )
  }),

  list: asyncHandler(async (req: Request, res: Response) => {
    const { status } = req.query
    const requests = await joinRequestService.listRequests(
      typeof status === "string" ? (status as JoinRequestStatus) : undefined
    )
    res.json(ApiResponse.success(requests))
  }),

  approve: asyncHandler(async (req: Request, res: Response) => {
    const { adminNotes } = req.body as { adminNotes?: string }
    const result = await joinRequestService.approveRequest(
      req.params["id"] as string,
      req.user!.id,
      adminNotes
    )
    res.json(ApiResponse.success(result, "Request approved. Login credentials sent by email."))
  }),

  reject: asyncHandler(async (req: Request, res: Response) => {
    const { adminNotes } = req.body as { adminNotes?: string }
    const request = await joinRequestService.rejectRequest(
      req.params["id"] as string,
      req.user!.id,
      adminNotes
    )
    res.json(ApiResponse.success(request, "Request rejected"))
  }),
}

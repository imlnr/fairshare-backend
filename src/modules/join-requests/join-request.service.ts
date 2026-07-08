import { ApiError } from "@/utils/api-error"
import { ROLE_KEYS } from "@/constants/roles"
import { User } from "@/modules/users/user.model"
import { userService } from "@/modules/users/user.service"
import {
  RoomManagerRequest,
  type JoinRequestStatus,
} from "@/modules/join-requests/room-manager-request.model"

type SubmitRequestInput = {
  name: string
  email: string
  phone?: string
  organization?: string
  message: string
}

export const joinRequestService = {
  async submitRequest(input: SubmitRequestInput) {
    const email = input.email.toLowerCase().trim()

    const existingUser = await User.findOne({ email })
    if (existingUser) {
      throw new ApiError(409, "An account with this email already exists. Please sign in instead.")
    }

    const pendingRequest = await RoomManagerRequest.findOne({ email, status: "pending" })
    if (pendingRequest) {
      throw new ApiError(409, "You already have a pending request. Please wait for admin review.")
    }

    return RoomManagerRequest.create({
      name: input.name.trim(),
      email,
      phone: input.phone?.trim(),
      organization: input.organization?.trim(),
      message: input.message.trim(),
      status: "pending",
    })
  },

  async listRequests(status?: JoinRequestStatus) {
    const query = status ? { status } : {}
    return RoomManagerRequest.find(query).sort({ createdAt: -1 }).lean()
  },

  async approveRequest(requestId: string, adminId: string, adminNotes?: string) {
    const request = await RoomManagerRequest.findById(requestId)
    if (!request) throw new ApiError(404, "Request not found")
    if (request.status !== "pending") {
      throw new ApiError(400, `This request has already been ${request.status}`)
    }

    const existingUser = await User.findOne({ email: request.email })
    if (existingUser) {
      throw new ApiError(409, "A user with this email already exists")
    }

    const user = await userService.createUserWithCredentials({
      name: request.name,
      email: request.email,
      roleKey: ROLE_KEYS.ROOM_MANAGER,
      roleLabel: "Room Manager",
    })

    request.status = "approved"
    request.reviewedBy = adminId as unknown as typeof request.reviewedBy
    request.reviewedAt = new Date()
    request.adminNotes = adminNotes?.trim()
    request.createdUserId = user._id
    await request.save()

    return { request, userId: user._id.toString() }
  },

  async rejectRequest(requestId: string, adminId: string, adminNotes?: string) {
    const request = await RoomManagerRequest.findById(requestId)
    if (!request) throw new ApiError(404, "Request not found")
    if (request.status !== "pending") {
      throw new ApiError(400, `This request has already been ${request.status}`)
    }

    request.status = "rejected"
    request.reviewedBy = adminId as unknown as typeof request.reviewedBy
    request.reviewedAt = new Date()
    request.adminNotes = adminNotes?.trim()
    await request.save()

    return request
  },
}

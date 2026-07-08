import type { Request, Response } from "express"
import { asyncHandler } from "@/middleware/async-handler"
import { sendSuccess } from "@/utils/api-response"
import { authService } from "@/modules/auth/auth.service"
import type { GoogleAuthInput, LoginInput } from "@/modules/auth/auth.types"

export const authController = {
  login: asyncHandler(async (req: Request, res: Response) => {
    const input = req.body as LoginInput
    const result = await authService.login(input)
    res.json(sendSuccess(result, "Logged in successfully"))
  }),

  googleLogin: asyncHandler(async (req: Request, res: Response) => {
    const input = req.body as GoogleAuthInput
    const result = await authService.loginWithGoogle(input)
    res.json(sendSuccess(result, "Google login successful"))
  }),

  getMe: asyncHandler(async (req: Request, res: Response) => {
    const user = await authService.getProfile(req.user!.id)
    res.json(sendSuccess(user, "Profile fetched successfully"))
  }),
}

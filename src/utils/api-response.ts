export type ApiSuccessResponse<T> = {
  success: true
  message: string
  data: T
}

export type ApiErrorResponse = {
  success: false
  message: string
  errors?: unknown
}

export function sendSuccess<T>(data: T, message = "Success"): ApiSuccessResponse<T> {
  return { success: true, message, data }
}

export function sendError(message: string, errors?: unknown): ApiErrorResponse {
  return { success: false, message, errors }
}

export const ApiResponse = {
  success: <T>(data: T, message = "Success") => sendSuccess(data, message),
  error: (message: string, errors?: unknown) => sendError(message, errors),
}

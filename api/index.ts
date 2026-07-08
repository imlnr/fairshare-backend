import type { VercelRequest, VercelResponse } from "@vercel/node"
import { getApplication } from "../dist/bootstrap"

export default async function handler(
  request: VercelRequest,
  response: VercelResponse
): Promise<void> {
  const app = await getApplication()
  app(request, response)
}

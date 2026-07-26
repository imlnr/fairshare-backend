import type { Request, Response } from "express"
import { asyncHandler } from "@/middleware/async-handler"
import { ApiResponse } from "@/utils/api-response"
import { expenseService } from "@/modules/expenses/expense.service"

export const expenseController = {
  listExpenses: asyncHandler(async (req: Request, res: Response) => {
    const { period } = req.query
    const expenses = await expenseService.listExpenses(
      req.params["roomId"] as string,
      typeof period === "string" ? period : undefined
    )
    res.json(ApiResponse.success(expenses))
  }),

  createExpense: asyncHandler(async (req: Request, res: Response) => {
    const expense = await expenseService.createExpense(
      req.params["roomId"] as string,
      req.body as Parameters<typeof expenseService.createExpense>[1],
      req.user!
    )
    res.status(201).json(ApiResponse.success(expense, "Expense created"))
  }),

  updateExpense: asyncHandler(async (req: Request, res: Response) => {
    const expense = await expenseService.updateExpense(
      req.params["roomId"] as string,
      req.params["expId"] as string,
      req.body as Parameters<typeof expenseService.updateExpense>[2]
    )
    res.json(ApiResponse.success(expense, "Expense updated"))
  }),

  deleteExpense: asyncHandler(async (req: Request, res: Response) => {
    const result = await expenseService.deleteExpense(
      req.params["roomId"] as string,
      req.params["expId"] as string
    )
    res.json(ApiResponse.success(result))
  }),
}

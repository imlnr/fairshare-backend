import type { Request, Response } from "express"
import { asyncHandler } from "@/middleware/async-handler"
import { ApiResponse } from "@/utils/api-response"
import { expenseService } from "@/modules/expenses/expense.service"

function queryString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : undefined
}

function queryStringList(value: unknown): string[] | undefined {
  const parts: string[] = []

  const push = (raw: unknown) => {
    if (typeof raw !== "string") return
    for (const piece of raw.split(",")) {
      const trimmed = piece.trim()
      if (trimmed) parts.push(trimmed)
    }
  }

  if (Array.isArray(value)) {
    value.forEach(push)
  } else {
    push(value)
  }

  return parts.length > 0 ? [...new Set(parts)] : undefined
}

function queryNumber(value: unknown): number | undefined {
  if (typeof value !== "string" || value.trim() === "") return undefined
  const n = Number(value)
  return Number.isFinite(n) ? n : undefined
}

function queryInt(value: unknown): number | undefined {
  const n = queryNumber(value)
  return n === undefined ? undefined : Math.trunc(n)
}

export const expenseController = {
  listExpenses: asyncHandler(async (req: Request, res: Response) => {
    const sortByRaw = queryString(req.query.sortBy)
    const sortOrderRaw = queryString(req.query.sortOrder)
    const page = queryInt(req.query.page)

    const expenses = await expenseService.listExpenses(req.params["roomId"] as string, {
      period: queryString(req.query.period),
      search: queryString(req.query.search),
      sortBy: sortByRaw === "price" || sortByRaw === "date" ? sortByRaw : undefined,
      sortOrder:
        sortOrderRaw === "asc" || sortOrderRaw === "desc" ? sortOrderRaw : undefined,
      paidBy: queryString(req.query.paidBy),
      splitWith: queryStringList(req.query.splitWith),
      minAmount: queryNumber(req.query.minAmount),
      maxAmount: queryNumber(req.query.maxAmount),
      page,
      pageSize: queryInt(req.query.pageSize),
    })
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
      req.body as Parameters<typeof expenseService.updateExpense>[2],
      req.user!
    )
    res.json(ApiResponse.success(expense, "Expense updated"))
  }),

  deleteExpense: asyncHandler(async (req: Request, res: Response) => {
    const result = await expenseService.deleteExpense(
      req.params["roomId"] as string,
      req.params["expId"] as string,
      req.user!
    )
    res.json(ApiResponse.success(result))
  }),
}

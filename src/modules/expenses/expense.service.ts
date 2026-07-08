import { ApiError } from "@/utils/api-error"
import { Expense } from "@/modules/expenses/expense.model"
import { RoomMember } from "@/modules/rooms/room-member.model"
import { validatePresence } from "@/modules/bills/bill-calculator"

type CreateExpenseInput = {
  title: string
  amount: number
  description?: string
  date: Date | string
  paidByUserId?: string
  presentMemberIds: string[]
}

function toBillPeriod(date: Date | string): string {
  const d = new Date(date)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, "0")
  return `${year}-${month}`
}

export const expenseService = {
  async listExpenses(roomId: string, period?: string) {
    const query: Record<string, unknown> = { roomId }
    if (period) query.billPeriod = period
    return Expense.find(query).sort({ date: -1 }).lean()
  },

  async createExpense(roomId: string, input: CreateExpenseInput, createdById: string) {
    const expenseDate = new Date(input.date)

    // Validate presence against active members on that date
    const memberships = await RoomMember.find({ roomId }).lean()
    const memberDateInfo = memberships.map((m) => ({
      userId: m.userId.toString(),
      joinedAt: m.joinedAt as Date,
      leftAt: (m.leftAt as Date | null) ?? null,
    }))

    const { valid, invalidIds } = validatePresence(
      input.presentMemberIds,
      memberDateInfo,
      expenseDate
    )

    if (!valid) {
      throw new ApiError(
        400,
        `Some members were not active on this expense date: ${invalidIds.join(", ")}`
      )
    }

    return Expense.create({
      roomId,
      title: input.title,
      amount: input.amount,
      description: input.description,
      date: expenseDate,
      paidByUserId: input.paidByUserId ?? null,
      presentMemberIds: input.presentMemberIds,
      billPeriod: toBillPeriod(expenseDate),
      createdBy: createdById,
    })
  },

  async updateExpense(
    expId: string,
    update: Partial<CreateExpenseInput & { isLocked: boolean }>
  ) {
    const expense = await Expense.findById(expId)
    if (!expense) throw new ApiError(404, "Expense not found")
    if (expense.isLocked) {
      throw new ApiError(409, "Expense is locked. Reopen the bill to edit.")
    }

    if (update.date) {
      update = { ...update, billPeriod: toBillPeriod(update.date) } as typeof update & {
        billPeriod: string
      }
    }

    Object.assign(expense, update)
    return expense.save()
  },

  async deleteExpense(expId: string) {
    const expense = await Expense.findById(expId)
    if (!expense) throw new ApiError(404, "Expense not found")
    if (expense.isLocked) {
      throw new ApiError(409, "Expense is locked. Reopen the bill to edit.")
    }
    await expense.deleteOne()
    return { message: "Expense deleted" }
  },
}

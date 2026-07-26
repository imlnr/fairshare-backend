import { ApiError } from "@/utils/api-error"
import { computeEqualShares } from "@/utils/split-math"
import { Expense } from "@/modules/expenses/expense.model"
import { Room } from "@/modules/rooms/room.model"
import { RoomMember } from "@/modules/rooms/room-member.model"
import { validatePresence } from "@/modules/bills/bill-calculator"
import { ROLE_KEYS } from "@/constants/roles"
import type { AuthenticatedUser } from "@/types/express"

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

function buildMemberShares(amount: number, presentMemberIds: string[]) {
  return computeEqualShares(amount, presentMemberIds).map((entry) => ({
    userId: entry.userId,
    share: entry.share,
  }))
}

export const expenseService = {
  async listExpenses(roomId: string, period?: string) {
    const query: Record<string, unknown> = { roomId }
    if (period) query.billPeriod = period
    return Expense.find(query).sort({ date: -1 }).lean()
  },

  async createExpense(
    roomId: string,
    input: CreateExpenseInput,
    user: AuthenticatedUser
  ) {
    const expenseDate = new Date(input.date)
    const room = await Room.findById(roomId).lean()
    if (!room) throw new ApiError(404, "Room not found")

    const isAdmin = user.role.key === ROLE_KEYS.ADMIN
    const isRoomManager =
      room.managerId?.toString() === user.id ||
      (user.role.key === ROLE_KEYS.ROOM_MANAGER && room.createdBy?.toString() === user.id)
    const includeManager = isAdmin || isRoomManager

    if (
      !includeManager &&
      room.managerId &&
      input.paidByUserId === room.managerId.toString()
    ) {
      throw new ApiError(400, "Invalid paid-by selection")
    }

    const memberships = await RoomMember.find({ roomId }).lean()
    const memberDateInfo = memberships.map((m) => ({
      userId: m.userId.toString(),
      joinedAt: m.joinedAt as Date,
      leftAt: (m.leftAt as Date | null) ?? null,
    }))

    if (includeManager && room.managerId) {
      memberDateInfo.push({
        userId: room.managerId.toString(),
        joinedAt: (room.createdAt as Date) ?? new Date(0),
        leftAt: null,
      })
    }

    if (
      !includeManager &&
      room.managerId &&
      input.presentMemberIds.includes(room.managerId.toString())
    ) {
      throw new ApiError(400, "Room manager cannot be included in present members")
    }

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

    if (!input.paidByUserId) {
      throw new ApiError(400, "Paid-by user is required")
    }

    const { valid: paidValid, invalidIds: paidInvalid } = validatePresence(
      [input.paidByUserId],
      memberDateInfo,
      expenseDate
    )

    if (!paidValid) {
      throw new ApiError(
        400,
        `Paid-by user is not an active participant on this date: ${paidInvalid.join(", ")}`
      )
    }

    if (!input.presentMemberIds.includes(input.paidByUserId)) {
      throw new ApiError(400, "Paid-by person must be included in present members")
    }

    const memberShares = buildMemberShares(input.amount, input.presentMemberIds)

    return Expense.create({
      roomId,
      title: input.title,
      amount: input.amount,
      description: input.description,
      date: expenseDate,
      paidByUserId: input.paidByUserId,
      presentMemberIds: input.presentMemberIds,
      memberShares,
      billPeriod: toBillPeriod(expenseDate),
      createdBy: user.id,
    })
  },

  async updateExpense(
    roomId: string,
    expId: string,
    update: Partial<CreateExpenseInput>
  ) {
    const expense = await Expense.findOne({ _id: expId, roomId })
    if (!expense) throw new ApiError(404, "Expense not found")
    if (expense.isLocked) {
      throw new ApiError(409, "Expense is locked. Reopen the bill to edit.")
    }

    if (update.date) {
      expense.date = new Date(update.date)
      expense.billPeriod = toBillPeriod(update.date)
    }
    if (update.title !== undefined) expense.title = update.title
    if (update.amount !== undefined) expense.amount = update.amount
    if (update.description !== undefined) expense.description = update.description
    if (update.paidByUserId !== undefined) expense.paidByUserId = update.paidByUserId as never
    if (update.presentMemberIds !== undefined) {
      expense.presentMemberIds = update.presentMemberIds as never
    }

    const amount = expense.amount
    const presentIds = expense.presentMemberIds.map((id) => id.toString())
    expense.set("memberShares", buildMemberShares(amount, presentIds))

    return expense.save()
  },

  async deleteExpense(roomId: string, expId: string) {
    const expense = await Expense.findOne({ _id: expId, roomId })
    if (!expense) throw new ApiError(404, "Expense not found")
    if (expense.isLocked) {
      throw new ApiError(409, "Expense is locked. Reopen the bill to edit.")
    }
    await expense.deleteOne()
    return { message: "Expense deleted" }
  },
}

import { ApiError } from "@/utils/api-error"
import { computeEqualShares } from "@/utils/split-math"
import { Expense } from "@/modules/expenses/expense.model"
import type { ExpenseDocument } from "@/modules/expenses/expense.model"
import { Room } from "@/modules/rooms/room.model"
import { RoomMember } from "@/modules/rooms/room-member.model"
import { validatePresence } from "@/modules/bills/bill-calculator"
import { ROLE_KEYS } from "@/constants/roles"
import type { AuthenticatedUser } from "@/types/express"

/** Payer (or room manager) may edit/delete an expense only within this window after creation. */
export const EXPENSE_EDIT_WINDOW_MS = 24 * 60 * 60 * 1000

type CreateExpenseInput = {
  title: string
  amount: number
  description?: string
  date: Date | string
  paidByUserId?: string
  presentMemberIds: string[]
}

type ExpenseLean = {
  amount: number
  presentMemberIds: unknown[]
  [key: string]: unknown
}

function isWithinEditWindow(createdAt: Date) {
  return Date.now() - createdAt.getTime() <= EXPENSE_EDIT_WINDOW_MS
}

async function assertCanMutateExpense(
  roomId: string,
  expense: ExpenseDocument & { createdAt?: Date },
  user: AuthenticatedUser
) {
  if (expense.isLocked) {
    throw new ApiError(409, "Expense is locked. Reopen the bill to edit.")
  }

  const createdAt = expense.createdAt ?? new Date(0)
  if (!isWithinEditWindow(createdAt)) {
    throw new ApiError(
      403,
      "The 24-hour edit window has closed. This expense can no longer be updated."
    )
  }

  const isAdmin = user.role.key === ROLE_KEYS.ADMIN
  const paidBy = expense.paidByUserId?.toString()
  const isPayer = paidBy === user.id

  if (isAdmin || isPayer) return

  const room = await Room.findById(roomId).lean()
  if (!room) throw new ApiError(404, "Room not found")

  const isRoomManager =
    room.managerId?.toString() === user.id ||
    (user.role.key === ROLE_KEYS.ROOM_MANAGER && room.createdBy?.toString() === user.id)

  if (!isRoomManager) {
    throw new ApiError(
      403,
      "Only the person who paid for this expense can update it within 24 hours of adding it."
    )
  }
}

function toBillPeriod(date: Date | string): string {
  const d = new Date(date)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, "0")
  return `${year}-${month}`
}

/** Equal-split shares derived on read from amount + present members (not stored). */
export function withMemberShares<T extends ExpenseLean>(expense: T) {
  const presentMemberIds = expense.presentMemberIds.map((id) => String(id))
  return {
    ...expense,
    memberShares: computeEqualShares(expense.amount, presentMemberIds),
  }
}

export type ListExpensesQuery = {
  period?: string
  search?: string
  sortBy?: "date" | "price"
  sortOrder?: "asc" | "desc"
  paidBy?: string
  /** Match expenses that include all of these members in the split. */
  splitWith?: string[]
  minAmount?: number
  maxAmount?: number
  /** When set, results are paginated. Omit to return all matches. */
  page?: number
  pageSize?: number
}

export type PaginatedExpenses = {
  items: ReturnType<typeof withMemberShares>[]
  page: number
  pageSize: number
  total: number
  totalPages: number
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function buildExpenseFilter(roomId: string, options: ListExpensesQuery) {
  const filter: Record<string, unknown> = { roomId }

  if (options.period) filter.billPeriod = options.period

  if (options.paidBy) filter.paidByUserId = options.paidBy

  if (options.splitWith && options.splitWith.length > 0) {
    filter.presentMemberIds = { $all: options.splitWith }
  }

  const amount: Record<string, number> = {}
  if (options.minAmount !== undefined && Number.isFinite(options.minAmount)) {
    amount.$gte = options.minAmount
  }
  if (options.maxAmount !== undefined && Number.isFinite(options.maxAmount)) {
    amount.$lte = options.maxAmount
  }
  if (Object.keys(amount).length > 0) filter.amount = amount

  const search = options.search?.trim()
  if (search) {
    const or: Record<string, unknown>[] = [
      { title: { $regex: escapeRegex(search), $options: "i" } },
      {
        $expr: {
          $regexMatch: {
            input: { $toString: "$amount" },
            regex: escapeRegex(search),
            options: "i",
          },
        },
      },
    ]
    const asNumber = Number(search)
    if (Number.isFinite(asNumber)) {
      or.push({ amount: asNumber })
    }
    filter.$or = or
  }

  return filter
}

export const expenseService = {
  async listExpenses(
    roomId: string,
    options: ListExpensesQuery = {}
  ): Promise<PaginatedExpenses> {
    const filter = buildExpenseFilter(roomId, options)
    const sortField = options.sortBy === "price" ? "amount" : "date"
    const sortDir = options.sortOrder === "asc" ? 1 : -1
    const sort: Record<string, 1 | -1> = { [sortField]: sortDir, _id: -1 }

    const total = await Expense.countDocuments(filter)
    const paginate = options.page !== undefined
    const pageSize = paginate
      ? Math.min(Math.max(options.pageSize ?? 10, 1), 100)
      : Math.max(total, 1)
    const totalPages = paginate ? Math.max(1, Math.ceil(total / pageSize)) : 1
    const page = paginate
      ? Math.min(Math.max(options.page ?? 1, 1), totalPages)
      : 1

    let query = Expense.find(filter).sort(sort)
    if (paginate) {
      query = query.skip((page - 1) * pageSize).limit(pageSize)
    }

    const expenses = await query.lean()
    return {
      items: expenses.map((expense) => withMemberShares(expense)),
      page,
      pageSize: paginate ? pageSize : total,
      total,
      totalPages,
    }
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

    const expense = await Expense.create({
      roomId,
      title: input.title,
      amount: input.amount,
      description: input.description,
      date: expenseDate,
      paidByUserId: input.paidByUserId,
      presentMemberIds: input.presentMemberIds,
      billPeriod: toBillPeriod(expenseDate),
      createdBy: user.id,
    })

    // Drop any legacy stored shares if present on older documents after migrations
    return withMemberShares(expense.toObject())
  },

  async updateExpense(
    roomId: string,
    expId: string,
    update: Partial<CreateExpenseInput>,
    user: AuthenticatedUser
  ) {
    const expense = await Expense.findOne({ _id: expId, roomId })
    if (!expense) throw new ApiError(404, "Expense not found")
    await assertCanMutateExpense(roomId, expense, user)

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

      const room = await Room.findById(roomId).lean()
      if (room) {
        const isAdmin = user.role.key === ROLE_KEYS.ADMIN
        const isRoomManager =
          room.managerId?.toString() === user.id ||
          (user.role.key === ROLE_KEYS.ROOM_MANAGER && room.createdBy?.toString() === user.id)
        const includeManager = isAdmin || isRoomManager

        if (
          !includeManager &&
          room.managerId &&
          update.presentMemberIds.includes(room.managerId.toString())
        ) {
          throw new ApiError(400, "Room manager cannot be included in present members")
        }
      }
    }

    const presentIds = expense.presentMemberIds.map((id) => id.toString())
    const paidBy = expense.paidByUserId?.toString()
    if (paidBy && !presentIds.includes(paidBy)) {
      throw new ApiError(400, "Paid-by person must be included in present members")
    }

    await expense.save()
    // Remove legacy stored shares from older documents (field no longer in schema)
    await Expense.updateOne({ _id: expense._id }, { $unset: { memberShares: 1 } })

    return withMemberShares(expense.toObject())
  },

  async deleteExpense(roomId: string, expId: string, user: AuthenticatedUser) {
    const expense = await Expense.findOne({ _id: expId, roomId })
    if (!expense) throw new ApiError(404, "Expense not found")
    await assertCanMutateExpense(roomId, expense, user)
    await expense.deleteOne()
    return { message: "Expense deleted" }
  },
}

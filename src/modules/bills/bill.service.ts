import { ApiError } from "@/utils/api-error"
import { computeEqualShares, computeSettlementTransfers } from "@/utils/split-math"
import { Bill } from "@/modules/bills/bill.model"
import { Expense } from "@/modules/expenses/expense.model"
import { Payment } from "@/modules/payments/payment.model"
import { Room } from "@/modules/rooms/room.model"
import { RoomMember } from "@/modules/rooms/room-member.model"
import { User } from "@/modules/users/user.model"
import { calculateBill } from "@/modules/bills/bill-calculator"
import { ROLE_KEYS } from "@/constants/roles"
import type { AuthenticatedUser } from "@/types/express"

async function resolveActiveMembersForBill(
  roomId: string,
  expenses: { presentMemberIds: unknown[]; paidByUserId?: unknown }[]
) {
  const ids = new Set<string>()

  for (const expense of expenses) {
    for (const id of expense.presentMemberIds) {
      ids.add(String(id))
    }
    if (expense.paidByUserId) {
      ids.add(String(expense.paidByUserId))
    }
  }

  const memberships = await RoomMember.find({ roomId, isActive: true }).lean()
  for (const membership of memberships) {
    ids.add(membership.userId.toString())
  }

  const room = await Room.findById(roomId).lean()
  if (room?.managerId) {
    ids.add(room.managerId.toString())
  }

  const users = await User.find({ _id: { $in: [...ids] } })
    .select("name")
    .lean()

  return users.map((user) => ({
    userId: user._id.toString(),
    name: user.name,
  }))
}

function transfersFromSummaries(
  summaries: { userId: unknown; finalAmount: number }[]
) {
  return computeSettlementTransfers(
    summaries.map((s) => ({
      userId: String(s.userId),
      finalAmount: s.finalAmount,
    }))
  )
}

export const billService = {
  async listBills(roomId: string) {
    const bills = await Bill.find({ roomId }).sort({ period: -1 })

    for (const bill of bills) {
      if (!bill.settlementTransfers || bill.settlementTransfers.length === 0) {
        const transfers = transfersFromSummaries(bill.memberSummaries)
        if (transfers.length > 0 || bill.memberSummaries.length > 0) {
          bill.set("settlementTransfers", transfers)
          await bill.save()
        }
      }
    }

    return bills.map((bill) => bill.toObject())
  },

  async getBill(billId: string, user: AuthenticatedUser) {
    const bill = await Bill.findById(billId)
    if (!bill) throw new ApiError(404, "Bill not found")

    if (!bill.settlementTransfers || bill.settlementTransfers.length === 0) {
      bill.set("settlementTransfers", transfersFromSummaries(bill.memberSummaries))
      await bill.save()
    }

    const lean = bill.toObject()

    if (
      user.role.key !== ROLE_KEYS.ADMIN &&
      user.role.key !== ROLE_KEYS.ROOM_MANAGER
    ) {
      const ownSummary = lean.memberSummaries.find(
        (s) => s.userId.toString() === user.id
      )
      const ownTransfers = lean.settlementTransfers.filter(
        (t) =>
          t.fromUserId.toString() === user.id || t.toUserId.toString() === user.id
      )
      return {
        ...lean,
        memberSummaries: ownSummary ? [ownSummary] : [],
        settlementTransfers: ownTransfers,
      }
    }

    return lean
  },

  async generateBill(roomId: string, period: string, generatedById: string) {
    if (!/^\d{4}-\d{2}$/.test(period)) {
      throw new ApiError(400, "Period must be in YYYY-MM format")
    }

    const existingBill = await Bill.findOne({ roomId, period })
    if (existingBill?.status === "locked") {
      throw new ApiError(
        409,
        `A locked bill already exists for ${period} (version ${existingBill.version}). Reopen it to regenerate.`
      )
    }

    const expenses = await Expense.find({ roomId, billPeriod: period })
    if (expenses.length === 0) {
      throw new ApiError(400, `No expenses found for period ${period}`)
    }

    // Ensure every expense has persisted shares before bill math
    for (const expense of expenses) {
      if (!expense.memberShares || expense.memberShares.length === 0) {
        expense.set(
          "memberShares",
          computeEqualShares(
            expense.amount,
            expense.presentMemberIds.map((id) => id.toString())
          )
        )
        await expense.save()
      }
    }

    const leanExpenses = expenses.map((e) => e.toObject())
    const activeMembers = await resolveActiveMembersForBill(roomId, leanExpenses)

    if (activeMembers.length === 0) {
      throw new ApiError(400, "No participants found for this bill period")
    }

    const [prevYear, prevMonth] = period.split("-").map(Number)
    const prevDate = new Date(prevYear, prevMonth - 2, 1)
    const prevPeriod = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, "0")}`
    const previousBill = await Bill.findOne({
      roomId,
      period: prevPeriod,
      status: "locked",
    }).lean()

    const previousBillSummaries = (previousBill?.memberSummaries ?? []).map((s) => ({
      userId: s.userId.toString(),
      finalAmount: s.finalAmount,
    }))

    const paymentsThisPeriod = existingBill
      ? await Payment.find({ billId: existingBill._id }).lean()
      : []

    const paymentsSummary = paymentsThisPeriod.map((p) => ({
      payerId: p.payerId.toString(),
      amount: p.amount,
    }))

    const { memberSummaries } = calculateBill({
      expenses: leanExpenses as Parameters<typeof calculateBill>[0]["expenses"],
      activeMembers,
      previousBillSummaries,
      paymentsThisPeriod: paymentsSummary,
    })

    const settlementTransfers = transfersFromSummaries(memberSummaries)
    const expenseIds = leanExpenses.map((e) => e._id)

    if (existingBill) {
      await Bill.findByIdAndUpdate(existingBill._id, {
        $set: {
          memberSummaries,
          settlementTransfers,
          lockedExpenseIds: expenseIds,
          status: "locked",
          generatedAt: new Date(),
          generatedBy: generatedById,
          version: (existingBill.version ?? 1) + 1,
        },
      })
    } else {
      await Bill.create({
        roomId,
        period,
        version: 1,
        status: "locked",
        generatedAt: new Date(),
        generatedBy: generatedById,
        memberSummaries,
        settlementTransfers,
        lockedExpenseIds: expenseIds,
      })
    }

    await Expense.updateMany(
      { _id: { $in: expenseIds } },
      { $set: { isLocked: true } }
    )

    return Bill.findOne({ roomId, period }).lean()
  },

  async reopenBill(billId: string) {
    const bill = await Bill.findById(billId)
    if (!bill) throw new ApiError(404, "Bill not found")
    if (bill.status !== "locked") {
      throw new ApiError(400, "Only locked bills can be reopened")
    }

    await Expense.updateMany(
      { _id: { $in: bill.lockedExpenseIds } },
      { $set: { isLocked: false } }
    )

    bill.status = "draft"
    bill.version = (bill.version ?? 1) + 1
    return bill.save()
  },
}

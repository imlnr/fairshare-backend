import { ApiError } from "@/utils/api-error"
import { Bill } from "@/modules/bills/bill.model"
import { Expense } from "@/modules/expenses/expense.model"
import { Payment } from "@/modules/payments/payment.model"
import { RoomMember } from "@/modules/rooms/room-member.model"
import { calculateBill } from "@/modules/bills/bill-calculator"
import { ROLE_KEYS } from "@/constants/roles"
import type { AuthenticatedUser } from "@/types/express"

export const billService = {
  async listBills(roomId: string) {
    return Bill.find({ roomId }).sort({ period: -1 }).lean()
  },

  async getBill(billId: string, user: AuthenticatedUser) {
    const bill = await Bill.findById(billId).lean()
    if (!bill) throw new ApiError(404, "Bill not found")

    // Members only see their own summary
    if (
      user.role.key !== ROLE_KEYS.ADMIN &&
      user.role.key !== ROLE_KEYS.ROOM_MANAGER
    ) {
      const ownSummary = bill.memberSummaries.find(
        (s) => s.userId.toString() === user.id
      )
      return { ...bill, memberSummaries: ownSummary ? [ownSummary] : [] }
    }

    return bill
  },

  async generateBill(roomId: string, period: string, generatedById: string) {
    // Validate period format
    if (!/^\d{4}-\d{2}$/.test(period)) {
      throw new ApiError(400, "Period must be in YYYY-MM format")
    }

    // Check for existing locked bill
    const existingBill = await Bill.findOne({ roomId, period })
    if (existingBill?.status === "locked") {
      throw new ApiError(409, `A locked bill already exists for ${period} (version ${existingBill.version}). Reopen it to regenerate.`)
    }

    // Fetch expenses for this period
    const expenses = await Expense.find({ roomId, billPeriod: period }).lean()
    if (expenses.length === 0) {
      throw new ApiError(400, `No expenses found for period ${period}`)
    }

    // Active members at time of generation
    const memberships = await RoomMember.find({ roomId, isActive: true })
      .populate("userId", "name email")
      .lean()

    if (memberships.length === 0) {
      throw new ApiError(400, "No active members in this room")
    }

    const activeMembers = memberships.map((m) => {
      const u = m.userId as unknown as { _id: { toString(): string }; name: string }
      return { userId: u._id.toString(), name: u.name }
    })

    // Get previous bill to carry forward pending amounts
    const [prevYear, prevMonth] = period.split("-").map(Number)
    const prevDate = new Date(prevYear, prevMonth - 2, 1)
    const prevPeriod = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, "0")}`
    const previousBill = await Bill.findOne({ roomId, period: prevPeriod, status: "locked" }).lean()

    const previousBillSummaries = (previousBill?.memberSummaries ?? []).map((s) => ({
      userId: s.userId.toString(),
      finalAmount: s.finalAmount,
    }))

    // Get payments recorded for this period's bill (if draft exists)
    const existingBillForPayments = existingBill
    const paymentsThisPeriod = existingBillForPayments
      ? await Payment.find({ billId: existingBillForPayments._id }).lean()
      : []

    const paymentsSummary = paymentsThisPeriod.map((p) => ({
      payerId: p.payerId.toString(),
      amount: p.amount,
    }))

    const { memberSummaries } = calculateBill({
      expenses: expenses as Parameters<typeof calculateBill>[0]["expenses"],
      activeMembers,
      previousBillSummaries,
      paymentsThisPeriod: paymentsSummary,
    })

    const expenseIds = expenses.map((e) => (e as { _id: unknown })._id)

    if (existingBill) {
      // Regenerate: update existing draft
      await Bill.findByIdAndUpdate(existingBill._id, {
        $set: {
          memberSummaries,
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
        lockedExpenseIds: expenseIds,
      })
    }

    const bill = await Bill.findOne({ roomId, period })

    // Lock all included expenses
    await Expense.updateMany(
      { _id: { $in: expenseIds } },
      { $set: { isLocked: true } }
    )

    return bill
  },

  async reopenBill(billId: string) {
    const bill = await Bill.findById(billId)
    if (!bill) throw new ApiError(404, "Bill not found")
    if (bill.status !== "locked") {
      throw new ApiError(400, "Only locked bills can be reopened")
    }

    // Unlock associated expenses
    await Expense.updateMany(
      { _id: { $in: bill.lockedExpenseIds } },
      { $set: { isLocked: false } }
    )

    bill.status = "draft"
    bill.version = (bill.version ?? 1) + 1
    return bill.save()
  },
}

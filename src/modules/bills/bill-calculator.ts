import type { Types } from "mongoose"
import type { ExpenseDocument } from "@/modules/expenses/expense.model"

export type MemberShareEntry = {
  userId: string
  currentShare: number
  netPaidFor: number
}

export type BillCalculationInput = {
  expenses: (ExpenseDocument & { _id: Types.ObjectId })[]
  activeMembers: { userId: string; name: string }[]
  previousBillSummaries: {
    userId: string
    finalAmount: number
  }[]
  paymentsThisPeriod: {
    payerId: string
    amount: number
  }[]
}

export type BillCalculationResult = {
  memberSummaries: {
    userId: string
    currentShare: number
    previousPending: number
    paymentsReceived: number
    netPaidFor: number
    finalAmount: number
    settlementStatus: "pending" | "partial" | "settled"
  }[]
}

/**
 * Round a number to 2 decimal places.
 */
function round2(n: number): number {
  return Math.round(n * 100) / 100
}

/**
 * Core bill calculation engine.
 *
 * Formula per member:
 *   share_i          = Σ (expense.amount / presentCount)  for each expense where member is present
 *   netPaidFor_i     = Σ expense.amount                    for each expense where member is paidBy
 *   net_current      = share_i - netPaidFor_i
 *   previousPending  = previous bill's finalAmount (0 if first bill)
 *   paymentsReceived = Σ payments made by this member in this period
 *   finalAmount      = net_current + previousPending - paymentsReceived
 *     positive → member OWES money (payable)
 *     negative → member is OWED money (receivable)
 *
 * Rounding:
 *   Each expense share is computed at full float precision.
 *   Accumulated per member at full precision.
 *   At finalization, totals are rounded to 2dp.
 *   Any rounding remainder (from n-way splits) is absorbed by the
 *   first present member (sorted by userId string for determinism).
 */
export function calculateBill(input: BillCalculationInput): BillCalculationResult {
  const { expenses, activeMembers, previousBillSummaries, paymentsThisPeriod } = input

  // Index previous pending by userId
  const previousPendingMap = new Map<string, number>()
  for (const prev of previousBillSummaries) {
    previousPendingMap.set(prev.userId, prev.finalAmount)
  }

  // Index payments by payerId
  const paymentsMap = new Map<string, number>()
  for (const payment of paymentsThisPeriod) {
    const existing = paymentsMap.get(payment.payerId) ?? 0
    paymentsMap.set(payment.payerId, existing + payment.amount)
  }

  // Accumulators at full precision
  const shareMap = new Map<string, number>()
  const netPaidForMap = new Map<string, number>()

  for (const member of activeMembers) {
    shareMap.set(member.userId, 0)
    netPaidForMap.set(member.userId, 0)
  }

  for (const expense of expenses) {
    const presentIds = expense.presentMemberIds.map((id) => id.toString())
    if (presentIds.length === 0) continue

    const rawShare = expense.amount / presentIds.length

    // Sort presentIds for deterministic remainder assignment
    const sortedPresent = [...presentIds].sort()

    // Compute rounded shares with remainder absorbed by first member
    const roundedShare = round2(rawShare)
    const totalRounded = round2(roundedShare * presentIds.length)
    const remainder = round2(expense.amount - totalRounded)

    for (let i = 0; i < sortedPresent.length; i++) {
      const uid = sortedPresent[i]
      const memberShare = i === 0 ? round2(roundedShare + remainder) : roundedShare
      const existing = shareMap.get(uid) ?? 0
      shareMap.set(uid, existing + memberShare)
    }

    // paidBy credit
    if (expense.paidByUserId) {
      const paidById = expense.paidByUserId.toString()
      const existingPaid = netPaidForMap.get(paidById) ?? 0
      netPaidForMap.set(paidById, existingPaid + expense.amount)
    }
  }

  const memberSummaries = activeMembers.map((member) => {
    const currentShare = round2(shareMap.get(member.userId) ?? 0)
    const netPaidFor = round2(netPaidForMap.get(member.userId) ?? 0)
    const previousPending = round2(previousPendingMap.get(member.userId) ?? 0)
    const paymentsReceived = round2(paymentsMap.get(member.userId) ?? 0)

    // net_current = what member owes the pool (their share) minus what they fronted
    const netCurrent = round2(currentShare - netPaidFor)
    const finalAmount = round2(netCurrent + previousPending - paymentsReceived)

    let settlementStatus: "pending" | "partial" | "settled" = "pending"
    if (finalAmount <= 0) {
      settlementStatus = "settled"
    } else if (paymentsReceived > 0) {
      settlementStatus = "partial"
    }

    return {
      userId: member.userId,
      currentShare,
      previousPending,
      paymentsReceived,
      netPaidFor,
      finalAmount,
      settlementStatus,
    }
  })

  return { memberSummaries }
}

/**
 * Validate that all presentMemberIds in an expense belong to
 * active room members who were active on the expense date.
 */
export function validatePresence(
  presentMemberIds: string[],
  activeOnDate: { userId: string; joinedAt: Date; leftAt: Date | null }[],
  expenseDate: Date
): { valid: boolean; invalidIds: string[] } {
  const eligibleSet = new Set(
    activeOnDate
      .filter((m) => {
        const joinedBefore = m.joinedAt <= expenseDate
        const notLeftYet = m.leftAt === null || m.leftAt >= expenseDate
        return joinedBefore && notLeftYet
      })
      .map((m) => m.userId)
  )

  const invalidIds = presentMemberIds.filter((id) => !eligibleSet.has(id))
  return { valid: invalidIds.length === 0, invalidIds }
}

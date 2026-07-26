import type { Types } from "mongoose"
import type { ExpenseDocument } from "@/modules/expenses/expense.model"
import { computeEqualShares, round2, settlementStatusFor } from "@/utils/split-math"

export type MemberShareEntry = {
  userId: string
  currentShare: number
  netPaidFor: number
}

export type BillCalculationInput = {
  expenses: (ExpenseDocument & {
    _id: Types.ObjectId
  })[]
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
 * Core bill calculation engine.
 * Equal shares are computed from each expense's amount + presentMemberIds.
 */
export function calculateBill(input: BillCalculationInput): BillCalculationResult {
  const { expenses, activeMembers, previousBillSummaries, paymentsThisPeriod } = input

  const previousPendingMap = new Map<string, number>()
  for (const prev of previousBillSummaries) {
    previousPendingMap.set(prev.userId, prev.finalAmount)
  }

  const paymentsMap = new Map<string, number>()
  for (const payment of paymentsThisPeriod) {
    const existing = paymentsMap.get(payment.payerId) ?? 0
    paymentsMap.set(payment.payerId, existing + payment.amount)
  }

  const shareMap = new Map<string, number>()
  const netPaidForMap = new Map<string, number>()

  for (const member of activeMembers) {
    shareMap.set(member.userId, 0)
    netPaidForMap.set(member.userId, 0)
  }

  for (const expense of expenses) {
    const shares = computeEqualShares(
      expense.amount,
      expense.presentMemberIds.map((id) => id.toString())
    )

    for (const entry of shares) {
      if (!shareMap.has(entry.userId)) {
        shareMap.set(entry.userId, 0)
        netPaidForMap.set(entry.userId, 0)
      }
      shareMap.set(entry.userId, (shareMap.get(entry.userId) ?? 0) + entry.share)
    }

    if (expense.paidByUserId) {
      const paidById = expense.paidByUserId.toString()
      if (!netPaidForMap.has(paidById)) {
        shareMap.set(paidById, shareMap.get(paidById) ?? 0)
        netPaidForMap.set(paidById, 0)
      }
      netPaidForMap.set(paidById, (netPaidForMap.get(paidById) ?? 0) + expense.amount)
    }
  }

  const memberIds = new Set<string>([
    ...activeMembers.map((m) => m.userId),
    ...shareMap.keys(),
    ...netPaidForMap.keys(),
  ])

  const memberSummaries = [...memberIds].sort().map((userId) => {
    const currentShare = round2(shareMap.get(userId) ?? 0)
    const netPaidFor = round2(netPaidForMap.get(userId) ?? 0)
    const previousPending = round2(previousPendingMap.get(userId) ?? 0)
    const paymentsReceived = round2(paymentsMap.get(userId) ?? 0)
    const netCurrent = round2(currentShare - netPaidFor)
    const finalAmount = round2(netCurrent + previousPending - paymentsReceived)

    return {
      userId,
      currentShare,
      previousPending,
      paymentsReceived,
      netPaidFor,
      finalAmount,
      settlementStatus: settlementStatusFor(finalAmount, paymentsReceived),
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

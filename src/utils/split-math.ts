/**
 * Shared money-split helpers used by expenses, bills, and payments.
 * All rounding is done here so frontend never invents balances.
 */

export type MemberShare = {
  userId: string
  share: number
}

export type SettlementTransfer = {
  fromUserId: string
  toUserId: string
  amount: number
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100
}

/**
 * Equal split with deterministic remainder absorbed by the first userId (sorted).
 */
export function computeEqualShares(amount: number, userIds: string[]): MemberShare[] {
  if (userIds.length === 0) return []

  const sorted = [...new Set(userIds.map(String))].sort()
  const rawShare = amount / sorted.length
  const roundedShare = round2(rawShare)
  const totalRounded = round2(roundedShare * sorted.length)
  const remainder = round2(amount - totalRounded)

  return sorted.map((userId, index) => ({
    userId,
    share: index === 0 ? round2(roundedShare + remainder) : roundedShare,
  }))
}

/**
 * Greedy minimize-cash-flow from stored finalAmounts.
 * positive finalAmount = owes (debtor)
 * negative finalAmount = owed (creditor)
 */
export function computeSettlementTransfers(
  summaries: { userId: string; finalAmount: number }[]
): SettlementTransfer[] {
  const debtors = summaries
    .filter((s) => s.finalAmount > 0.009)
    .map((s) => ({ userId: String(s.userId), amount: s.finalAmount }))
    .sort((a, b) => b.amount - a.amount)

  const creditors = summaries
    .filter((s) => s.finalAmount < -0.009)
    .map((s) => ({ userId: String(s.userId), amount: -s.finalAmount }))
    .sort((a, b) => b.amount - a.amount)

  const transfers: SettlementTransfer[] = []
  let i = 0
  let j = 0

  while (i < debtors.length && j < creditors.length) {
    const amount = round2(Math.min(debtors[i].amount, creditors[j].amount))
    if (amount > 0) {
      transfers.push({
        fromUserId: debtors[i].userId,
        toUserId: creditors[j].userId,
        amount,
      })
    }

    debtors[i].amount = round2(debtors[i].amount - amount)
    creditors[j].amount = round2(creditors[j].amount - amount)

    if (debtors[i].amount < 0.01) i += 1
    if (creditors[j].amount < 0.01) j += 1
  }

  return transfers
}

export function settlementStatusFor(
  finalAmount: number,
  paymentsReceived: number
): "pending" | "partial" | "settled" {
  if (finalAmount <= 0) return "settled"
  if (paymentsReceived > 0) return "partial"
  return "pending"
}

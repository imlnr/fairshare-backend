import { ApiError } from "@/utils/api-error"
import {
  computeSettlementTransfers,
  round2,
  settlementStatusFor,
} from "@/utils/split-math"
import { Payment } from "@/modules/payments/payment.model"
import { Bill } from "@/modules/bills/bill.model"

export const paymentService = {
  async listPayments(roomId: string, billId: string) {
    const bill = await Bill.findOne({ _id: billId, roomId }).lean()
    if (!bill) throw new ApiError(404, "Bill not found")

    return Payment.find({ billId, roomId }).populate("payerId", "name email image").lean()
  },

  async recordPayment(
    billId: string,
    roomId: string,
    input: { payerId: string; amount: number; notes?: string; paidAt?: Date },
    recordedById: string
  ) {
    const bill = await Bill.findOne({ _id: billId, roomId })
    if (!bill) throw new ApiError(404, "Bill not found")

    const summary = bill.memberSummaries.find((s) => s.userId.toString() === input.payerId)
    if (!summary) {
      throw new ApiError(400, "This user does not have a summary in the specified bill")
    }

    if (typeof input.amount !== "number" || input.amount <= 0) {
      throw new ApiError(400, "Payment amount must be a positive number")
    }

    const payment = await Payment.create({
      billId,
      roomId,
      payerId: input.payerId,
      amount: input.amount,
      recordedBy: recordedById,
      notes: input.notes,
      paidAt: input.paidAt ?? new Date(),
    })

    const allPayments = await Payment.find({ billId, roomId }).lean()
    const paidByUser = new Map<string, number>()
    for (const row of allPayments) {
      const key = row.payerId.toString()
      paidByUser.set(key, round2((paidByUser.get(key) ?? 0) + row.amount))
    }

    for (const member of bill.memberSummaries) {
      const userId = member.userId.toString()
      const paymentsReceived = paidByUser.get(userId) ?? 0
      const netBeforePayments = round2(
        member.currentShare - member.netPaidFor + member.previousPending
      )
      const finalAmount = round2(netBeforePayments - paymentsReceived)
      member.paymentsReceived = paymentsReceived
      member.finalAmount = finalAmount
      member.settlementStatus = settlementStatusFor(finalAmount, paymentsReceived)
    }

    bill.set(
      "settlementTransfers",
      computeSettlementTransfers(
        bill.memberSummaries.map((s) => ({
          userId: s.userId.toString(),
          finalAmount: s.finalAmount,
        }))
      )
    )

    await bill.save()

    return payment
  },
}

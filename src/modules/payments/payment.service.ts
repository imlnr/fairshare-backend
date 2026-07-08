import { ApiError } from "@/utils/api-error"
import { Payment } from "@/modules/payments/payment.model"
import { Bill } from "@/modules/bills/bill.model"

export const paymentService = {
  async listPayments(billId: string) {
    return Payment.find({ billId }).populate("payerId", "name email image").lean()
  },

  async recordPayment(
    billId: string,
    roomId: string,
    input: { payerId: string; amount: number; notes?: string; paidAt?: Date },
    recordedById: string
  ) {
    const bill = await Bill.findById(billId)
    if (!bill) throw new ApiError(404, "Bill not found")

    // Find the member's summary
    const summary = bill.memberSummaries.find((s) => s.userId.toString() === input.payerId)
    if (!summary) {
      throw new ApiError(400, "This user does not have a summary in the specified bill")
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

    // Recalculate settlement status for this member
    const allPayments = await Payment.find({ billId, payerId: input.payerId })
    const totalPaid = allPayments.reduce((sum, p) => sum + p.amount, 0)
    const newFinal = summary.finalAmount - totalPaid

    let settlementStatus: "pending" | "partial" | "settled"
    if (newFinal <= 0) {
      settlementStatus = "settled"
    } else if (totalPaid > 0) {
      settlementStatus = "partial"
    } else {
      settlementStatus = "pending"
    }

    await Bill.updateOne(
      { _id: billId, "memberSummaries.userId": input.payerId },
      {
        $set: {
          "memberSummaries.$.paymentsReceived": totalPaid,
          "memberSummaries.$.settlementStatus": settlementStatus,
        },
      }
    )

    return payment
  },
}

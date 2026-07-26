import { Router } from "express"
import { authenticate, authorize, requireRoomAccess, requireExpenseUnlocked } from "@/middleware/authorize"
import { roomController } from "@/modules/rooms/room.controller"
import { expenseController } from "@/modules/expenses/expense.controller"
import { billController } from "@/modules/bills/bill.controller"
import { paymentController } from "@/modules/payments/payment.controller"

const roomRoutes = Router()

// --- /api/rooms ---
roomRoutes.get("/", authenticate, roomController.listRooms)
roomRoutes.post("/", authenticate, authorize("rooms:create"), roomController.createRoom)
roomRoutes.get("/:roomId", authenticate, requireRoomAccess("member"), roomController.getRoom)
roomRoutes.patch(
  "/:roomId",
  authenticate,
  requireRoomAccess("manager"),
  authorize("rooms:update"),
  roomController.updateRoom
)
roomRoutes.delete("/:roomId", authenticate, requireRoomAccess("manager"), roomController.deleteRoom)
roomRoutes.post(
  "/:roomId/assign-manager",
  authenticate,
  roomController.assignManager
)

// --- /api/rooms/:roomId/members ---
roomRoutes.get(
  "/:roomId/members",
  authenticate,
  requireRoomAccess("manager"),
  roomController.listMembers
)
roomRoutes.get(
  "/:roomId/participants",
  authenticate,
  requireRoomAccess("member"),
  roomController.listParticipants
)
roomRoutes.post(
  "/:roomId/members",
  authenticate,
  requireRoomAccess("manager"),
  roomController.addMember
)
roomRoutes.patch(
  "/:roomId/members/:memberId",
  authenticate,
  requireRoomAccess("manager"),
  roomController.updateMember
)

// --- /api/rooms/:roomId/expenses ---
roomRoutes.get(
  "/:roomId/expenses",
  authenticate,
  requireRoomAccess("member"),
  expenseController.listExpenses
)
roomRoutes.post(
  "/:roomId/expenses",
  authenticate,
  requireRoomAccess("member"),
  authorize("expenses:create"),
  expenseController.createExpense
)
roomRoutes.patch(
  "/:roomId/expenses/:expId",
  authenticate,
  requireRoomAccess("member"),
  requireExpenseUnlocked,
  expenseController.updateExpense
)
roomRoutes.delete(
  "/:roomId/expenses/:expId",
  authenticate,
  requireRoomAccess("member"),
  requireExpenseUnlocked,
  expenseController.deleteExpense
)

// --- /api/rooms/:roomId/bills ---
roomRoutes.get(
  "/:roomId/bills",
  authenticate,
  requireRoomAccess("member"),
  billController.listBills
)
roomRoutes.post(
  "/:roomId/bills/generate",
  authenticate,
  requireRoomAccess("manager"),
  authorize("bills:generate"),
  billController.generateBill
)
roomRoutes.get(
  "/:roomId/bills/:billId",
  authenticate,
  requireRoomAccess("member"),
  billController.getBill
)
roomRoutes.post(
  "/:roomId/bills/:billId/reopen",
  authenticate,
  requireRoomAccess("manager"),
  authorize("bills:reopen"),
  billController.reopenBill
)

// --- /api/rooms/:roomId/bills/:billId/payments ---
roomRoutes.get(
  "/:roomId/bills/:billId/payments",
  authenticate,
  requireRoomAccess("manager"),
  authorize("payments:read"),
  paymentController.listPayments
)
roomRoutes.post(
  "/:roomId/bills/:billId/payments",
  authenticate,
  requireRoomAccess("manager"),
  authorize("payments:create"),
  paymentController.recordPayment
)

export { roomRoutes }

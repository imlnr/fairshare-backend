"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.roomRoutes = void 0;
const express_1 = require("express");
const authorize_1 = require("../../middleware/authorize");
const room_controller_1 = require("../../modules/rooms/room.controller");
const expense_controller_1 = require("../../modules/expenses/expense.controller");
const bill_controller_1 = require("../../modules/bills/bill.controller");
const payment_controller_1 = require("../../modules/payments/payment.controller");
const roomRoutes = (0, express_1.Router)();
exports.roomRoutes = roomRoutes;
// --- /api/rooms ---
roomRoutes.get("/", authorize_1.authenticate, room_controller_1.roomController.listRooms);
roomRoutes.post("/", authorize_1.authenticate, (0, authorize_1.authorize)("rooms:create"), room_controller_1.roomController.createRoom);
roomRoutes.get("/:roomId", authorize_1.authenticate, (0, authorize_1.requireRoomAccess)("member"), room_controller_1.roomController.getRoom);
roomRoutes.patch("/:roomId", authorize_1.authenticate, (0, authorize_1.requireRoomAccess)("manager"), (0, authorize_1.authorize)("rooms:update"), room_controller_1.roomController.updateRoom);
roomRoutes.delete("/:roomId", authorize_1.authenticate, (0, authorize_1.requireRoomAccess)("manager"), room_controller_1.roomController.deleteRoom);
roomRoutes.post("/:roomId/assign-manager", authorize_1.authenticate, (0, authorize_1.authorize)("rooms:manage_members"), room_controller_1.roomController.assignManager);
// --- /api/rooms/:roomId/members ---
roomRoutes.get("/:roomId/members", authorize_1.authenticate, (0, authorize_1.requireRoomAccess)("manager"), room_controller_1.roomController.listMembers);
roomRoutes.get("/:roomId/participants", authorize_1.authenticate, (0, authorize_1.requireRoomAccess)("member"), room_controller_1.roomController.listParticipants);
roomRoutes.post("/:roomId/members", authorize_1.authenticate, (0, authorize_1.requireRoomAccess)("manager"), room_controller_1.roomController.addMember);
roomRoutes.patch("/:roomId/members/:memberId", authorize_1.authenticate, (0, authorize_1.requireRoomAccess)("manager"), room_controller_1.roomController.updateMember);
// --- /api/rooms/:roomId/expenses ---
roomRoutes.get("/:roomId/expenses", authorize_1.authenticate, (0, authorize_1.requireRoomAccess)("member"), expense_controller_1.expenseController.listExpenses);
roomRoutes.post("/:roomId/expenses", authorize_1.authenticate, (0, authorize_1.requireRoomAccess)("member"), (0, authorize_1.authorize)("expenses:create"), expense_controller_1.expenseController.createExpense);
roomRoutes.patch("/:roomId/expenses/:expId", authorize_1.authenticate, (0, authorize_1.requireRoomAccess)("manager"), authorize_1.requireExpenseUnlocked, expense_controller_1.expenseController.updateExpense);
roomRoutes.delete("/:roomId/expenses/:expId", authorize_1.authenticate, (0, authorize_1.requireRoomAccess)("manager"), authorize_1.requireExpenseUnlocked, expense_controller_1.expenseController.deleteExpense);
// --- /api/rooms/:roomId/bills ---
roomRoutes.get("/:roomId/bills", authorize_1.authenticate, (0, authorize_1.requireRoomAccess)("member"), bill_controller_1.billController.listBills);
roomRoutes.post("/:roomId/bills/generate", authorize_1.authenticate, (0, authorize_1.requireRoomAccess)("manager"), (0, authorize_1.authorize)("bills:generate"), bill_controller_1.billController.generateBill);
roomRoutes.get("/:roomId/bills/:billId", authorize_1.authenticate, (0, authorize_1.requireRoomAccess)("member"), bill_controller_1.billController.getBill);
roomRoutes.post("/:roomId/bills/:billId/reopen", authorize_1.authenticate, (0, authorize_1.requireRoomAccess)("manager"), (0, authorize_1.authorize)("bills:reopen"), bill_controller_1.billController.reopenBill);
// --- /api/rooms/:roomId/bills/:billId/payments ---
roomRoutes.get("/:roomId/bills/:billId/payments", authorize_1.authenticate, (0, authorize_1.requireRoomAccess)("manager"), (0, authorize_1.authorize)("payments:read"), payment_controller_1.paymentController.listPayments);
roomRoutes.post("/:roomId/bills/:billId/payments", authorize_1.authenticate, (0, authorize_1.requireRoomAccess)("manager"), (0, authorize_1.authorize)("payments:create"), payment_controller_1.paymentController.recordPayment);

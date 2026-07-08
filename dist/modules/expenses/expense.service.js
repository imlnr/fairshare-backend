"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.expenseService = void 0;
const api_error_1 = require("../../utils/api-error");
const expense_model_1 = require("../../modules/expenses/expense.model");
const room_model_1 = require("../../modules/rooms/room.model");
const room_member_model_1 = require("../../modules/rooms/room-member.model");
const bill_calculator_1 = require("../../modules/bills/bill-calculator");
const roles_1 = require("../../constants/roles");
function toBillPeriod(date) {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    return `${year}-${month}`;
}
exports.expenseService = {
    async listExpenses(roomId, period) {
        const query = { roomId };
        if (period)
            query.billPeriod = period;
        return expense_model_1.Expense.find(query).sort({ date: -1 }).lean();
    },
    async createExpense(roomId, input, user) {
        const expenseDate = new Date(input.date);
        const room = await room_model_1.Room.findById(roomId).lean();
        if (!room)
            throw new api_error_1.ApiError(404, "Room not found");
        const isAdmin = user.role.key === roles_1.ROLE_KEYS.ADMIN;
        const isRoomManager = room.managerId?.toString() === user.id ||
            (user.role.key === roles_1.ROLE_KEYS.ROOM_MANAGER && room.createdBy?.toString() === user.id);
        const includeManager = isAdmin || isRoomManager;
        if (!includeManager &&
            room.managerId &&
            input.paidByUserId === room.managerId.toString()) {
            throw new api_error_1.ApiError(400, "Invalid paid-by selection");
        }
        const memberships = await room_member_model_1.RoomMember.find({ roomId }).lean();
        const memberDateInfo = memberships.map((m) => ({
            userId: m.userId.toString(),
            joinedAt: m.joinedAt,
            leftAt: m.leftAt ?? null,
        }));
        if (includeManager && room.managerId) {
            memberDateInfo.push({
                userId: room.managerId.toString(),
                joinedAt: room.createdAt ?? new Date(0),
                leftAt: null,
            });
        }
        if (!includeManager &&
            room.managerId &&
            input.presentMemberIds.includes(room.managerId.toString())) {
            throw new api_error_1.ApiError(400, "Room manager cannot be included in present members");
        }
        const { valid, invalidIds } = (0, bill_calculator_1.validatePresence)(input.presentMemberIds, memberDateInfo, expenseDate);
        if (!valid) {
            throw new api_error_1.ApiError(400, `Some members were not active on this expense date: ${invalidIds.join(", ")}`);
        }
        if (!input.paidByUserId) {
            throw new api_error_1.ApiError(400, "Paid-by user is required");
        }
        const { valid: paidValid, invalidIds: paidInvalid } = (0, bill_calculator_1.validatePresence)([input.paidByUserId], memberDateInfo, expenseDate);
        if (!paidValid) {
            throw new api_error_1.ApiError(400, `Paid-by user is not an active participant on this date: ${paidInvalid.join(", ")}`);
        }
        if (!input.presentMemberIds.includes(input.paidByUserId)) {
            throw new api_error_1.ApiError(400, "Paid-by person must be included in present members");
        }
        return expense_model_1.Expense.create({
            roomId,
            title: input.title,
            amount: input.amount,
            description: input.description,
            date: expenseDate,
            paidByUserId: input.paidByUserId,
            presentMemberIds: input.presentMemberIds,
            billPeriod: toBillPeriod(expenseDate),
            createdBy: user.id,
        });
    },
    async updateExpense(expId, update) {
        const expense = await expense_model_1.Expense.findById(expId);
        if (!expense)
            throw new api_error_1.ApiError(404, "Expense not found");
        if (expense.isLocked) {
            throw new api_error_1.ApiError(409, "Expense is locked. Reopen the bill to edit.");
        }
        if (update.date) {
            update = { ...update, billPeriod: toBillPeriod(update.date) };
        }
        Object.assign(expense, update);
        return expense.save();
    },
    async deleteExpense(expId) {
        const expense = await expense_model_1.Expense.findById(expId);
        if (!expense)
            throw new api_error_1.ApiError(404, "Expense not found");
        if (expense.isLocked) {
            throw new api_error_1.ApiError(409, "Expense is locked. Reopen the bill to edit.");
        }
        await expense.deleteOne();
        return { message: "Expense deleted" };
    },
};

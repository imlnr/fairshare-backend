"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.expenseController = void 0;
const async_handler_1 = require("../../middleware/async-handler");
const api_response_1 = require("../../utils/api-response");
const expense_service_1 = require("../../modules/expenses/expense.service");
exports.expenseController = {
    listExpenses: (0, async_handler_1.asyncHandler)(async (req, res) => {
        const { period } = req.query;
        const expenses = await expense_service_1.expenseService.listExpenses(req.params["roomId"], typeof period === "string" ? period : undefined);
        res.json(api_response_1.ApiResponse.success(expenses));
    }),
    createExpense: (0, async_handler_1.asyncHandler)(async (req, res) => {
        const expense = await expense_service_1.expenseService.createExpense(req.params["roomId"], req.body, req.user);
        res.status(201).json(api_response_1.ApiResponse.success(expense, "Expense created"));
    }),
    updateExpense: (0, async_handler_1.asyncHandler)(async (req, res) => {
        const expense = await expense_service_1.expenseService.updateExpense(req.params["expId"], req.body);
        res.json(api_response_1.ApiResponse.success(expense, "Expense updated"));
    }),
    deleteExpense: (0, async_handler_1.asyncHandler)(async (req, res) => {
        const result = await expense_service_1.expenseService.deleteExpense(req.params["expId"]);
        res.json(api_response_1.ApiResponse.success(result));
    }),
};

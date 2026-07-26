"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateBill = calculateBill;
exports.validatePresence = validatePresence;
const split_math_1 = require("../../utils/split-math");
/**
 * Core bill calculation engine.
 *
 * Prefer stored expense.memberShares when present; otherwise compute equal shares.
 */
function calculateBill(input) {
    const { expenses, activeMembers, previousBillSummaries, paymentsThisPeriod } = input;
    const previousPendingMap = new Map();
    for (const prev of previousBillSummaries) {
        previousPendingMap.set(prev.userId, prev.finalAmount);
    }
    const paymentsMap = new Map();
    for (const payment of paymentsThisPeriod) {
        const existing = paymentsMap.get(payment.payerId) ?? 0;
        paymentsMap.set(payment.payerId, existing + payment.amount);
    }
    const shareMap = new Map();
    const netPaidForMap = new Map();
    for (const member of activeMembers) {
        shareMap.set(member.userId, 0);
        netPaidForMap.set(member.userId, 0);
    }
    for (const expense of expenses) {
        const storedShares = expense.memberShares ?? [];
        const shares = storedShares.length > 0
            ? storedShares.map((s) => ({
                userId: s.userId.toString(),
                share: s.share,
            }))
            : (0, split_math_1.computeEqualShares)(expense.amount, expense.presentMemberIds.map((id) => id.toString()));
        for (const entry of shares) {
            if (!shareMap.has(entry.userId)) {
                shareMap.set(entry.userId, 0);
                netPaidForMap.set(entry.userId, 0);
            }
            shareMap.set(entry.userId, (shareMap.get(entry.userId) ?? 0) + entry.share);
        }
        if (expense.paidByUserId) {
            const paidById = expense.paidByUserId.toString();
            if (!netPaidForMap.has(paidById)) {
                shareMap.set(paidById, shareMap.get(paidById) ?? 0);
                netPaidForMap.set(paidById, 0);
            }
            netPaidForMap.set(paidById, (netPaidForMap.get(paidById) ?? 0) + expense.amount);
        }
    }
    const memberIds = new Set([
        ...activeMembers.map((m) => m.userId),
        ...shareMap.keys(),
        ...netPaidForMap.keys(),
    ]);
    const memberSummaries = [...memberIds].sort().map((userId) => {
        const currentShare = (0, split_math_1.round2)(shareMap.get(userId) ?? 0);
        const netPaidFor = (0, split_math_1.round2)(netPaidForMap.get(userId) ?? 0);
        const previousPending = (0, split_math_1.round2)(previousPendingMap.get(userId) ?? 0);
        const paymentsReceived = (0, split_math_1.round2)(paymentsMap.get(userId) ?? 0);
        const netCurrent = (0, split_math_1.round2)(currentShare - netPaidFor);
        const finalAmount = (0, split_math_1.round2)(netCurrent + previousPending - paymentsReceived);
        return {
            userId,
            currentShare,
            previousPending,
            paymentsReceived,
            netPaidFor,
            finalAmount,
            settlementStatus: (0, split_math_1.settlementStatusFor)(finalAmount, paymentsReceived),
        };
    });
    return { memberSummaries };
}
/**
 * Validate that all presentMemberIds in an expense belong to
 * active room members who were active on the expense date.
 */
function validatePresence(presentMemberIds, activeOnDate, expenseDate) {
    const eligibleSet = new Set(activeOnDate
        .filter((m) => {
        const joinedBefore = m.joinedAt <= expenseDate;
        const notLeftYet = m.leftAt === null || m.leftAt >= expenseDate;
        return joinedBefore && notLeftYet;
    })
        .map((m) => m.userId));
    const invalidIds = presentMemberIds.filter((id) => !eligibleSet.has(id));
    return { valid: invalidIds.length === 0, invalidIds };
}

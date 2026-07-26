import { Types } from "mongoose"
import { ApiError } from "@/utils/api-error"
import { round2 } from "@/utils/split-math"
import { ROLE_KEYS } from "@/constants/roles"
import { Expense } from "@/modules/expenses/expense.model"
import { Bill } from "@/modules/bills/bill.model"
import { Payment } from "@/modules/payments/payment.model"
import { User } from "@/modules/users/user.model"
import { roomService } from "@/modules/rooms/room.service"
import type { AuthenticatedUser } from "@/types/express"
import type {
  ActivityItem,
  DashboardRange,
  DashboardResponse,
  DashboardRoomOption,
  HealthIndicator,
  ManagerDashboardData,
  MemberBalanceItem,
  MemberDashboardData,
  MemberSettlementItem,
  PendingAction,
  PeriodAmount,
  SettlementPreviewItem,
} from "@/modules/dashboard/dashboard.types"

const RANGES: DashboardRange[] = ["3m", "6m", "12m", "ytd", "all"]

function toPeriod(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
}

function parseRange(raw: unknown): DashboardRange {
  if (typeof raw === "string" && RANGES.includes(raw as DashboardRange)) {
    return raw as DashboardRange
  }
  return "6m"
}

/** Inclusive start period (YYYY-MM), or null for all-time. */
function rangeStartPeriod(range: DashboardRange): string | null {
  if (range === "all") return null
  const now = new Date()
  if (range === "ytd") {
    return `${now.getFullYear()}-01`
  }
  const months = range === "3m" ? 3 : range === "12m" ? 12 : 6
  const start = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1)
  return toPeriod(start)
}

function periodsInRange(range: DashboardRange): string[] {
  const start = rangeStartPeriod(range)
  const end = toPeriod(new Date())
  if (!start) {
    // last 24 months for chart continuity when all-time
    const periods: string[] = []
    const now = new Date()
    for (let i = 23; i >= 0; i -= 1) {
      periods.push(toPeriod(new Date(now.getFullYear(), now.getMonth() - i, 1)))
    }
    return periods
  }
  const [sy, sm] = start.split("-").map(Number)
  const [ey, em] = end.split("-").map(Number)
  const periods: string[] = []
  let y = sy
  let m = sm
  while (y < ey || (y === ey && m <= em)) {
    periods.push(`${y}-${String(m).padStart(2, "0")}`)
    m += 1
    if (m > 12) {
      m = 1
      y += 1
    }
  }
  return periods
}

function fillTrend(periods: string[], map: Map<string, number>): PeriodAmount[] {
  return periods.map((period) => ({
    period,
    amount: round2(map.get(period) ?? 0),
  }))
}

function momPct(trend: PeriodAmount[]): number | null {
  if (trend.length < 2) return null
  const prev = trend[trend.length - 2]?.amount ?? 0
  const curr = trend[trend.length - 1]?.amount ?? 0
  if (prev === 0) return curr === 0 ? 0 : null
  return round2(((curr - prev) / prev) * 100)
}

function healthFromMetrics(input: {
  collectionRate: number
  openBalance: number
  pendingUnsettled: number
  missingBillRooms: number
}): HealthIndicator {
  const factors: string[] = []
  let score = 100

  if (input.collectionRate < 50) {
    score -= 30
    factors.push("Collection rate is below 50%")
  } else if (input.collectionRate < 80) {
    score -= 15
    factors.push("Collection rate could improve")
  } else {
    factors.push("Strong payment collection")
  }

  if (input.openBalance > 0) {
    score -= Math.min(25, Math.round(input.openBalance / 500) * 5)
    factors.push(`₹${input.openBalance.toFixed(0)} still outstanding`)
  }

  if (input.pendingUnsettled > 0) {
    score -= Math.min(20, input.pendingUnsettled * 4)
    factors.push(`${input.pendingUnsettled} member(s) not fully settled`)
  }

  if (input.missingBillRooms > 0) {
    score -= Math.min(15, input.missingBillRooms * 8)
    factors.push(`${input.missingBillRooms} room(s) missing a bill for this month`)
  }

  score = Math.max(0, Math.min(100, score))
  const label = score >= 75 ? "healthy" : score >= 45 ? "watch" : "at_risk"
  return { score, label, factors: factors.slice(0, 4) }
}

async function resolveAccessibleRooms(user: AuthenticatedUser) {
  const rooms = await roomService.listRooms(user)
  return rooms.map((r) => ({
    id: String(r._id),
    name: r.name as string,
    isActive: Boolean(r.isActive),
    objectId: r._id as Types.ObjectId,
  }))
}

function isManagerView(user: AuthenticatedUser) {
  return user.role.key === ROLE_KEYS.ADMIN || user.role.key === ROLE_KEYS.ROOM_MANAGER
}

export const dashboardService = {
  async getDashboard(
    user: AuthenticatedUser,
    query: { range?: unknown; roomId?: unknown }
  ): Promise<DashboardResponse> {
    const range = parseRange(query.range)
    const accessible = await resolveAccessibleRooms(user)

    if (accessible.length === 0) {
      if (isManagerView(user)) {
        return emptyManager(range)
      }
      return emptyMember(range)
    }

    let selectedRoomId: string | null =
      typeof query.roomId === "string" && query.roomId ? query.roomId : null

    if (selectedRoomId && !accessible.some((r) => r.id === selectedRoomId)) {
      throw new ApiError(403, "You do not have access to this room")
    }

    const scoped = selectedRoomId
      ? accessible.filter((r) => r.id === selectedRoomId)
      : accessible

    const roomIds = scoped.map((r) => r.objectId)
    const roomMap = new Map(scoped.map((r) => [r.id, r]))
    const roomOptions: DashboardRoomOption[] = accessible.map((r) => ({
      id: r.id,
      name: r.name,
      isActive: r.isActive,
    }))

    if (isManagerView(user)) {
      return buildManagerDashboard({
        user,
        range,
        roomIds,
        roomMap,
        roomOptions,
        selectedRoomId,
        allAccessibleActive: accessible.filter((r) => r.isActive).length,
      })
    }

    return buildMemberDashboard({
      user,
      range,
      roomIds,
      roomMap,
      roomOptions,
      selectedRoomId,
    })
  },
}

function emptyManager(range: DashboardRange): ManagerDashboardData {
  return {
    view: "manager",
    range,
    rooms: [],
    selectedRoomId: null,
    kpis: {
      totalSpend: 0,
      activeRooms: 0,
      openBalance: 0,
      collectionRate: 0,
      expenseCount: 0,
      lockedBills: 0,
      spendMomPct: null,
    },
    spendTrend: [],
    paymentTrend: [],
    roomBreakdown: [],
    memberBalances: [],
    settlementPreview: [],
    payerContributions: [],
    pendingActions: [],
    recentActivity: [],
    health: { score: 100, label: "healthy", factors: ["No rooms yet — create one to get started"] },
  }
}

function emptyMember(range: DashboardRange): MemberDashboardData {
  return {
    view: "member",
    range,
    rooms: [],
    selectedRoomId: null,
    kpis: {
      mySpendThisMonth: 0,
      myOutstanding: 0,
      mySettledCount: 0,
      amountOwedToMe: 0,
      amountIOwe: 0,
      spendMomPct: null,
    },
    spendTrend: [],
    settlements: [],
    paymentHistory: [],
    pendingActions: [],
    recentActivity: [],
    roomSummaries: [],
  }
}

async function buildManagerDashboard(ctx: {
  user: AuthenticatedUser
  range: DashboardRange
  roomIds: Types.ObjectId[]
  roomMap: Map<string, { id: string; name: string; isActive: boolean }>
  roomOptions: DashboardRoomOption[]
  selectedRoomId: string | null
  allAccessibleActive: number
}): Promise<ManagerDashboardData> {
  const { range, roomIds, roomMap, roomOptions, selectedRoomId, allAccessibleActive } = ctx
  const startPeriod = rangeStartPeriod(range)
  const chartPeriods = periodsInRange(range)
  const currentPeriod = toPeriod(new Date())

  const expenseMatch: Record<string, unknown> = { roomId: { $in: roomIds } }
  if (startPeriod) expenseMatch.billPeriod = { $gte: startPeriod }

  const paymentMatch: Record<string, unknown> = { roomId: { $in: roomIds } }
  if (startPeriod) {
    const [y, m] = startPeriod.split("-").map(Number)
    paymentMatch.paidAt = { $gte: new Date(y, m - 1, 1) }
  }

  const [
    spendByPeriod,
    spendByRoom,
    spendByPayer,
    expenseCountAgg,
    recentExpenses,
    bills,
    paymentByPeriod,
    recentPayments,
  ] = await Promise.all([
    Expense.aggregate<{ _id: string; amount: number; count: number }>([
      { $match: expenseMatch },
      { $group: { _id: "$billPeriod", amount: { $sum: "$amount" }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
    Expense.aggregate<{ _id: Types.ObjectId; amount: number; count: number }>([
      { $match: expenseMatch },
      {
        $group: {
          _id: "$roomId",
          amount: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
    ]),
    Expense.aggregate<{ _id: Types.ObjectId | null; amount: number }>([
      { $match: { ...expenseMatch, paidByUserId: { $ne: null } } },
      { $group: { _id: "$paidByUserId", amount: { $sum: "$amount" } } },
      { $sort: { amount: -1 } },
      { $limit: 8 },
    ]),
    Expense.aggregate<{ _id: null; count: number; amount: number }>([
      { $match: expenseMatch },
      { $group: { _id: null, count: { $sum: 1 }, amount: { $sum: "$amount" } } },
    ]),
    Expense.find(expenseMatch)
      .sort({ createdAt: -1 })
      .limit(8)
      .select("title amount roomId createdAt billPeriod")
      .lean(),
    Bill.find({ roomId: { $in: roomIds } })
      .sort({ period: -1 })
      .lean(),
    Payment.aggregate<{ _id: string; amount: number }>([
      { $match: paymentMatch },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m", date: "$paidAt" },
          },
          amount: { $sum: "$amount" },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    Payment.find(paymentMatch)
      .sort({ paidAt: -1 })
      .limit(6)
      .select("amount roomId paidAt billId")
      .lean(),
  ])

  const spendMap = new Map(spendByPeriod.map((r) => [r._id, r.amount]))
  const paymentMap = new Map(paymentByPeriod.map((r) => [r._id, r.amount]))
  const spendTrend = fillTrend(chartPeriods, spendMap)
  const paymentTrend = fillTrend(chartPeriods, paymentMap)

  const totalSpend = round2(expenseCountAgg[0]?.amount ?? 0)
  const expenseCount = expenseCountAgg[0]?.count ?? 0

  // Latest bill per room
  const latestBillByRoom = new Map<string, (typeof bills)[0]>()
  for (const bill of bills) {
    const rid = String(bill.roomId)
    if (!latestBillByRoom.has(rid)) latestBillByRoom.set(rid, bill)
  }

  let openBalance = 0
  let totalDue = 0
  let totalPaid = 0
  let lockedBills = 0
  const memberBalances: MemberBalanceItem[] = []
  const settlementPreview: SettlementPreviewItem[] = []
  const pendingActions: PendingAction[] = []
  const userIds = new Set<string>()

  for (const bill of bills) {
    if (bill.status === "locked") lockedBills += 1
  }

  for (const [roomId, bill] of latestBillByRoom) {
    const roomName = roomMap.get(roomId)?.name ?? "Room"
    for (const s of bill.memberSummaries ?? []) {
      const uid = String(s.userId)
      userIds.add(uid)
      const finalAmount = round2(s.finalAmount)
      if (finalAmount > 0.009) {
        openBalance = round2(openBalance + finalAmount)
        totalDue = round2(totalDue + finalAmount + (s.paymentsReceived ?? 0))
        totalPaid = round2(totalPaid + (s.paymentsReceived ?? 0))
      } else {
        totalPaid = round2(totalPaid + (s.paymentsReceived ?? 0))
        totalDue = round2(totalDue + Math.max(0, s.currentShare - s.netPaidFor + s.previousPending))
      }

      if (s.settlementStatus !== "settled" && Math.abs(finalAmount) > 0.009) {
        memberBalances.push({
          userId: uid,
          name: uid,
          roomId,
          roomName,
          finalAmount,
          settlementStatus: s.settlementStatus as MemberBalanceItem["settlementStatus"],
        })
      }
    }

    for (const t of bill.settlementTransfers ?? []) {
      userIds.add(String(t.fromUserId))
      userIds.add(String(t.toUserId))
      settlementPreview.push({
        fromUserId: String(t.fromUserId),
        fromName: String(t.fromUserId),
        toUserId: String(t.toUserId),
        toName: String(t.toUserId),
        amount: round2(t.amount),
        roomId,
        roomName,
      })
    }

    if (bill.status === "locked" && roomMap.get(roomId)?.isActive) {
      // current month bill check handled below
    }
  }

  // Missing bill for current period
  let missingBillRooms = 0
  for (const room of roomMap.values()) {
    if (!room.isActive) {
      pendingActions.push({
        id: `inactive-${room.id}`,
        type: "inactive_room",
        title: `${room.name} is inactive`,
        description: "Reactivate the room to resume expense tracking.",
        roomId: room.id,
        roomName: room.name,
        href: `/rooms/${room.id}/expenses`,
        severity: "info",
      })
      continue
    }
    const hasCurrent = bills.some(
      (b) => String(b.roomId) === room.id && b.period === currentPeriod
    )
    if (!hasCurrent) {
      missingBillRooms += 1
      pendingActions.push({
        id: `missing-bill-${room.id}`,
        type: "missing_bill",
        title: `Generate ${currentPeriod} bill`,
        description: `No bill generated yet for ${room.name} this month.`,
        roomId: room.id,
        roomName: room.name,
        href: `/rooms/${room.id}/bills`,
        severity: "warning",
      })
    }
  }

  for (const bal of memberBalances.filter((b) => b.settlementStatus !== "settled").slice(0, 5)) {
    pendingActions.push({
      id: `unsettled-${bal.roomId}-${bal.userId}`,
      type: "unsettled_member",
      title: bal.finalAmount > 0 ? "Pending collection" : "Credit balance",
      description: `${bal.name} · ${bal.roomName} · ₹${Math.abs(bal.finalAmount).toFixed(2)}`,
      roomId: bal.roomId,
      roomName: bal.roomName,
      href: `/rooms/${bal.roomId}/bills`,
      severity: bal.finalAmount > 0 ? "warning" : "info",
    })
  }

  for (const p of spendByPayer) {
    if (p._id) userIds.add(String(p._id))
  }

  const users = await User.find({ _id: { $in: [...userIds] } })
    .select("name")
    .lean()
  const nameMap = new Map(users.map((u) => [String(u._id), u.name as string]))

  for (const bal of memberBalances) {
    bal.name = nameMap.get(bal.userId) ?? "Member"
  }
  for (const s of settlementPreview) {
    s.fromName = nameMap.get(s.fromUserId) ?? "Member"
    s.toName = nameMap.get(s.toUserId) ?? "Member"
  }

  // Fix pending action descriptions with names
  for (const action of pendingActions) {
    if (action.type === "unsettled_member") {
      const bal = memberBalances.find((b) => action.id.endsWith(b.userId))
      if (bal) {
        action.description = `${bal.name} · ${bal.roomName} · ₹${Math.abs(bal.finalAmount).toFixed(2)}`
      }
    }
  }

  const payerContributions = spendByPayer
    .filter((p) => p._id)
    .map((p) => ({
      userId: String(p._id),
      name: nameMap.get(String(p._id)) ?? "Member",
      amount: round2(p.amount),
    }))

  const outstandingByRoom = new Map<string, number>()
  for (const bal of memberBalances) {
    if (bal.finalAmount > 0) {
      outstandingByRoom.set(
        bal.roomId,
        round2((outstandingByRoom.get(bal.roomId) ?? 0) + bal.finalAmount)
      )
    }
  }

  const roomBreakdown = spendByRoom.map((r) => {
    const roomId = String(r._id)
    return {
      roomId,
      roomName: roomMap.get(roomId)?.name ?? "Room",
      spend: round2(r.amount),
      outstanding: outstandingByRoom.get(roomId) ?? 0,
      expenseCount: r.count,
    }
  })

  const collectionDenom = totalDue > 0 ? totalDue : totalPaid + openBalance
  const collectionRate =
    collectionDenom > 0 ? round2((totalPaid / collectionDenom) * 100) : openBalance === 0 ? 100 : 0

  const recentActivity: ActivityItem[] = []
  for (const exp of recentExpenses) {
    const roomId = String(exp.roomId)
    recentActivity.push({
      id: `exp-${String(exp._id)}`,
      type: "expense",
      title: exp.title,
      subtitle: exp.billPeriod,
      amount: exp.amount,
      roomId,
      roomName: roomMap.get(roomId)?.name ?? "Room",
      at: (exp.createdAt as Date)?.toISOString?.() ?? new Date().toISOString(),
    })
  }
  for (const pay of recentPayments) {
    const roomId = String(pay.roomId)
    recentActivity.push({
      id: `pay-${String(pay._id)}`,
      type: "payment",
      title: "Payment recorded",
      amount: pay.amount,
      roomId,
      roomName: roomMap.get(roomId)?.name ?? "Room",
      at: (pay.paidAt as Date)?.toISOString?.() ?? new Date().toISOString(),
    })
  }
  recentActivity.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())

  const unsettledCount = memberBalances.filter((b) => b.finalAmount > 0.009).length

  return {
    view: "manager",
    range,
    rooms: roomOptions,
    selectedRoomId,
    kpis: {
      totalSpend,
      activeRooms: selectedRoomId
        ? roomMap.get(selectedRoomId)?.isActive
          ? 1
          : 0
        : allAccessibleActive,
      openBalance,
      collectionRate,
      expenseCount,
      lockedBills,
      spendMomPct: momPct(spendTrend),
    },
    spendTrend,
    paymentTrend,
    roomBreakdown,
    memberBalances: memberBalances
      .sort((a, b) => Math.abs(b.finalAmount) - Math.abs(a.finalAmount))
      .slice(0, 10),
    settlementPreview: settlementPreview.sort((a, b) => b.amount - a.amount).slice(0, 8),
    payerContributions,
    pendingActions: pendingActions.slice(0, 10),
    recentActivity: recentActivity.slice(0, 12),
    health: healthFromMetrics({
      collectionRate,
      openBalance,
      pendingUnsettled: unsettledCount,
      missingBillRooms,
    }),
  }
}

async function buildMemberDashboard(ctx: {
  user: AuthenticatedUser
  range: DashboardRange
  roomIds: Types.ObjectId[]
  roomMap: Map<string, { id: string; name: string; isActive: boolean }>
  roomOptions: DashboardRoomOption[]
  selectedRoomId: string | null
}): Promise<MemberDashboardData> {
  const { user, range, roomIds, roomMap, roomOptions, selectedRoomId } = ctx
  const startPeriod = rangeStartPeriod(range)
  const chartPeriods = periodsInRange(range)
  const currentPeriod = toPeriod(new Date())
  const userOid = new Types.ObjectId(user.id)

  const expenseMatch: Record<string, unknown> = {
    roomId: { $in: roomIds },
    presentMemberIds: userOid,
  }
  if (startPeriod) expenseMatch.billPeriod = { $gte: startPeriod }

  const [bills, payments, recentExpenses, paidByMe] = await Promise.all([
    Bill.find({ roomId: { $in: roomIds } })
      .sort({ period: -1 })
      .lean(),
    Payment.find({ roomId: { $in: roomIds }, payerId: userOid })
      .sort({ paidAt: -1 })
      .limit(20)
      .lean(),
    Expense.find(expenseMatch)
      .sort({ createdAt: -1 })
      .limit(10)
      .select("title amount roomId createdAt billPeriod paidByUserId presentMemberIds")
      .lean(),
    Expense.aggregate<{ _id: string; amount: number }>([
      {
        $match: {
          roomId: { $in: roomIds },
          paidByUserId: userOid,
          ...(startPeriod ? { billPeriod: { $gte: startPeriod } } : {}),
        },
      },
      { $group: { _id: "$billPeriod", amount: { $sum: "$amount" } } },
    ]),
  ])

  // Personal share trend from bill memberSummaries
  const shareMap = new Map<string, number>()
  let myOutstanding = 0
  let mySettledCount = 0
  let amountIOwe = 0
  let amountOwedToMe = 0
  const settlements: MemberSettlementItem[] = []
  const roomSummaries: MemberDashboardData["roomSummaries"] = []
  const pendingActions: PendingAction[] = []
  const nameIds = new Set<string>([user.id])

  const latestBillByRoom = new Map<string, (typeof bills)[0]>()
  for (const bill of bills) {
    const rid = String(bill.roomId)
    if (!latestBillByRoom.has(rid)) latestBillByRoom.set(rid, bill)

    const mine = (bill.memberSummaries ?? []).find((s) => String(s.userId) === user.id)
    if (mine) {
      shareMap.set(bill.period, round2((shareMap.get(bill.period) ?? 0) + mine.currentShare))
    }
  }

  for (const [roomId, bill] of latestBillByRoom) {
    const roomName = roomMap.get(roomId)?.name ?? "Room"
    const mine = (bill.memberSummaries ?? []).find((s) => String(s.userId) === user.id)
    if (!mine) {
      roomSummaries.push({
        roomId,
        roomName,
        outstanding: 0,
        settlementStatus: "none",
      })
      continue
    }

    const finalAmount = round2(mine.finalAmount)
    if (mine.settlementStatus === "settled" || Math.abs(finalAmount) < 0.01) {
      mySettledCount += 1
    }
    if (finalAmount > 0.009) {
      myOutstanding = round2(myOutstanding + finalAmount)
      pendingActions.push({
        id: `bal-${roomId}`,
        type: "outstanding_balance",
        title: `Pay ₹${finalAmount.toFixed(2)}`,
        description: `Outstanding on ${roomName} · ${bill.period}`,
        roomId,
        roomName,
        href: `/rooms/${roomId}/bills`,
        severity: "warning",
      })
    }

    roomSummaries.push({
      roomId,
      roomName,
      outstanding: Math.max(0, finalAmount),
      settlementStatus: mine.settlementStatus as MemberDashboardData["roomSummaries"][0]["settlementStatus"],
    })

    for (const t of bill.settlementTransfers ?? []) {
      const from = String(t.fromUserId)
      const to = String(t.toUserId)
      if (from !== user.id && to !== user.id) continue
      nameIds.add(from)
      nameIds.add(to)
      const direction = from === user.id ? "owe" : "owed"
      if (direction === "owe") amountIOwe = round2(amountIOwe + t.amount)
      else amountOwedToMe = round2(amountOwedToMe + t.amount)

      settlements.push({
        fromUserId: from,
        fromName: from,
        toUserId: to,
        toName: to,
        amount: round2(t.amount),
        roomId,
        roomName,
        direction,
      })

      pendingActions.push({
        id: `xfer-${roomId}-${from}-${to}`,
        type: "unsettled_transfer",
        title: direction === "owe" ? "You need to pay" : "You are owed",
        description: `₹${t.amount.toFixed(2)} · ${roomName}`,
        roomId,
        roomName,
        href: `/rooms/${roomId}/bills`,
        severity: direction === "owe" ? "warning" : "info",
      })
    }
  }

  // Prefer share from bills; fallback: estimate from expenses paid-by-me is wrong for "my spend".
  // Also compute current month share from expenses where user is present.
  const currentMonthExpenses = await Expense.find({
    roomId: { $in: roomIds },
    billPeriod: currentPeriod,
    presentMemberIds: userOid,
  })
    .select("amount presentMemberIds")
    .lean()

  let mySpendThisMonth = shareMap.get(currentPeriod) ?? 0
  if (mySpendThisMonth === 0 && currentMonthExpenses.length > 0) {
    mySpendThisMonth = round2(
      currentMonthExpenses.reduce((sum, e) => {
        const n = e.presentMemberIds?.length || 1
        return sum + e.amount / n
      }, 0)
    )
  }

  // Fill spend trend: prefer bill shares, else approximate from present expenses
  if ([...shareMap.keys()].length === 0) {
    const approx = await Expense.aggregate<{ _id: string; amount: number; members: number }>([
      { $match: expenseMatch },
      {
        $project: {
          billPeriod: 1,
          amount: 1,
          memberCount: { $size: "$presentMemberIds" },
        },
      },
      {
        $group: {
          _id: "$billPeriod",
          amount: { $sum: { $divide: ["$amount", "$memberCount"] } },
        },
      },
    ])
    for (const row of approx) {
      shareMap.set(row._id, round2(row.amount))
    }
  }

  // Also merge paid-by totals as secondary signal only if no share data — already handled
  void paidByMe

  const spendTrend = fillTrend(chartPeriods, shareMap)

  const billPeriodById = new Map(bills.map((b) => [String(b._id), b.period]))

  const users = await User.find({ _id: { $in: [...nameIds] } })
    .select("name")
    .lean()
  const nameMap = new Map(users.map((u) => [String(u._id), u.name as string]))

  for (const s of settlements) {
    s.fromName = nameMap.get(s.fromUserId) ?? "Member"
    s.toName = nameMap.get(s.toUserId) ?? "Member"
  }

  const paymentHistory = payments.map((p) => ({
    id: String(p._id),
    amount: p.amount,
    roomId: String(p.roomId),
    roomName: roomMap.get(String(p.roomId))?.name ?? "Room",
    period: billPeriodById.get(String(p.billId)) ?? "—",
    paidAt: (p.paidAt as Date)?.toISOString?.() ?? new Date().toISOString(),
    notes: p.notes || undefined,
  }))

  const recentActivity: ActivityItem[] = recentExpenses.map((exp) => {
    const roomId = String(exp.roomId)
    return {
      id: `exp-${String(exp._id)}`,
      type: "expense" as const,
      title: exp.title,
      subtitle:
        String(exp.paidByUserId) === user.id ? "You paid" : "Split includes you",
      amount: exp.amount,
      roomId,
      roomName: roomMap.get(roomId)?.name ?? "Room",
      at: (exp.createdAt as Date)?.toISOString?.() ?? new Date().toISOString(),
    }
  })

  return {
    view: "member",
    range,
    rooms: roomOptions,
    selectedRoomId,
    kpis: {
      mySpendThisMonth: round2(mySpendThisMonth),
      myOutstanding,
      mySettledCount,
      amountOwedToMe,
      amountIOwe,
      spendMomPct: momPct(spendTrend),
    },
    spendTrend,
    settlements: settlements.slice(0, 12),
    paymentHistory,
    pendingActions: pendingActions.slice(0, 10),
    recentActivity: recentActivity.slice(0, 12),
    roomSummaries,
  }
}

/** Dashboard response DTOs. Pending actions/insights are derived from expenses/bills/payments only. */

export type DashboardRange = "3m" | "6m" | "12m" | "ytd" | "all"

export type DashboardRoleView = "manager" | "member"

export type PeriodAmount = {
  period: string
  amount: number
}

export type DashboardRoomOption = {
  id: string
  name: string
  isActive: boolean
}

export type PendingAction = {
  id: string
  type: "missing_bill" | "unsettled_member" | "inactive_room" | "outstanding_balance" | "unsettled_transfer"
  title: string
  description: string
  roomId?: string
  roomName?: string
  href?: string
  severity: "info" | "warning" | "critical"
}

export type ActivityItem = {
  id: string
  type: "expense" | "bill" | "payment"
  title: string
  subtitle?: string
  amount?: number
  roomId: string
  roomName: string
  at: string
}

export type ManagerKpis = {
  totalSpend: number
  activeRooms: number
  openBalance: number
  collectionRate: number
  expenseCount: number
  lockedBills: number
  spendMomPct: number | null
}

export type RoomBreakdownItem = {
  roomId: string
  roomName: string
  spend: number
  outstanding: number
  expenseCount: number
}

export type MemberBalanceItem = {
  userId: string
  name: string
  roomId: string
  roomName: string
  finalAmount: number
  settlementStatus: "pending" | "partial" | "settled"
}

export type SettlementPreviewItem = {
  fromUserId: string
  fromName: string
  toUserId: string
  toName: string
  amount: number
  roomId: string
  roomName: string
}

export type PayerContributionItem = {
  userId: string
  name: string
  amount: number
}

export type HealthIndicator = {
  score: number
  label: "healthy" | "watch" | "at_risk"
  factors: string[]
}

export type ManagerDashboardData = {
  view: "manager"
  range: DashboardRange
  rooms: DashboardRoomOption[]
  selectedRoomId: string | null
  kpis: ManagerKpis
  spendTrend: PeriodAmount[]
  paymentTrend: PeriodAmount[]
  roomBreakdown: RoomBreakdownItem[]
  memberBalances: MemberBalanceItem[]
  settlementPreview: SettlementPreviewItem[]
  payerContributions: PayerContributionItem[]
  pendingActions: PendingAction[]
  recentActivity: ActivityItem[]
  health: HealthIndicator
}

export type MemberKpis = {
  mySpendThisMonth: number
  myOutstanding: number
  mySettledCount: number
  amountOwedToMe: number
  amountIOwe: number
  spendMomPct: number | null
}

export type MemberSettlementItem = {
  fromUserId: string
  fromName: string
  toUserId: string
  toName: string
  amount: number
  roomId: string
  roomName: string
  direction: "owe" | "owed"
}

export type MemberPaymentHistoryItem = {
  id: string
  amount: number
  roomId: string
  roomName: string
  period: string
  paidAt: string
  notes?: string
}

export type MemberRoomSummary = {
  roomId: string
  roomName: string
  outstanding: number
  settlementStatus: "pending" | "partial" | "settled" | "none"
}

export type MemberDashboardData = {
  view: "member"
  range: DashboardRange
  rooms: DashboardRoomOption[]
  selectedRoomId: string | null
  kpis: MemberKpis
  spendTrend: PeriodAmount[]
  settlements: MemberSettlementItem[]
  paymentHistory: MemberPaymentHistoryItem[]
  pendingActions: PendingAction[]
  recentActivity: ActivityItem[]
  roomSummaries: MemberRoomSummary[]
}

export type DashboardResponse = ManagerDashboardData | MemberDashboardData

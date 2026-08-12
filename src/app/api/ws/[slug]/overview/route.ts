import { NextRequest, NextResponse } from 'next/server'
import { requireWsAdmin } from '@/lib/ws-admin'
import { todayInTz } from '@/lib/timezone'
import { getMembersOnLeaveToday, getPendingLeaveRequests, type PendingLeaveSummary } from '@/lib/db/queries/leaves'
import {
  getDepartmentBreakdown,
  getUpcomingCelebrations,
  type DepartmentBreakdown,
  type UpcomingCelebration,
} from '@/lib/db/queries/employees'

export interface OverviewWidgetsResponse {
  onLeaveToday: number
  pendingLeaveRequests: PendingLeaveSummary[]
  departmentBreakdown: DepartmentBreakdown[]
  celebrations: UpcomingCelebration[]
}

interface Props {
  params: Promise<{ slug: string }>
}

export async function GET(req: NextRequest, { params }: Props) {
  const { slug } = await params
  const ctx = await requireWsAdmin(req, slug)
  if (!ctx) return NextResponse.json({ error: 'Forbidden', code: 'FORBIDDEN' }, { status: 403 })

  const today = todayInTz(ctx.workspace.display_timezone)

  const [onLeaveMembers, pendingLeaveRequests, departmentBreakdown, celebrations] = await Promise.all([
    getMembersOnLeaveToday(ctx.workspace.id, today),
    ctx.workspace.leaves_enabled ? getPendingLeaveRequests(ctx.workspace.id, 5) : Promise.resolve([]),
    getDepartmentBreakdown(ctx.workspace.id),
    getUpcomingCelebrations(ctx.workspace.id, today, 14),
  ])

  return NextResponse.json({
    onLeaveToday: onLeaveMembers.length,
    pendingLeaveRequests,
    departmentBreakdown,
    celebrations,
  } satisfies OverviewWidgetsResponse)
}

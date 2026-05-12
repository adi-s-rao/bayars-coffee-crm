import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { type NextRequest, NextResponse } from 'next/server'

function getPeriodStart(period: string): string {
  const now = new Date()
  if (period === 'today') {
    const d = new Date(now)
    d.setHours(0, 0, 0, 0)
    return d.toISOString()
  }
  if (period === 'week') {
    const d = new Date(now)
    d.setDate(d.getDate() - 7)
    return d.toISOString()
  }
  const d = new Date(now)
  d.setDate(d.getDate() - 30)
  return d.toISOString()
}

export async function GET(request: NextRequest) {
  try {
    const serverClient = await createClient()
    const { data: { user } } = await serverClient.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = createAdminClient()
    const { data: profileData } = await admin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if ((profileData as { role: string } | null)?.role !== 'manager') {
      return NextResponse.json({ error: 'Manager access required' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') ?? 'week'
    const since = getPeriodStart(period)

    const [leadsResult, checkInsResult, newLeadsResult] = await Promise.all([
      admin.from('leads').select('status'),
      admin
        .from('checkins')
        .select('user_id, user_name, type, distance_from_previous_km')
        .gte('created_at', since),
      admin
        .from('leads')
        .select('created_by')
        .gte('created_at', since),
    ])

    const allLeads = (leadsResult.data ?? []) as { status: string }[]
    const allCheckIns = (checkInsResult.data ?? []) as {
      user_id: string
      user_name: string
      type: string
      distance_from_previous_km: number | null
    }[]
    const newLeadsData = (newLeadsResult.data ?? []) as { created_by: string }[]

    const visitCheckIns = allCheckIns.filter(
      c => c.type !== 'start_day' && c.type !== 'end_day'
    )

    const pipeline: Record<string, number> = {
      cold_lead: 0,
      hot_lead: 0,
      demo_scheduled: 0,
      customer: 0,
      competitor: 0,
    }
    for (const l of allLeads) {
      if (l.status in pipeline) pipeline[l.status]++
    }

    const repMap = new Map<string, {
      user_name: string
      checkIns: number
      distanceKm: number
      newLeads: number
    }>()

    for (const c of visitCheckIns) {
      const existing = repMap.get(c.user_id)
      if (existing) {
        existing.checkIns++
        existing.distanceKm += c.distance_from_previous_km ?? 0
      } else {
        repMap.set(c.user_id, {
          user_name: c.user_name,
          checkIns: 1,
          distanceKm: c.distance_from_previous_km ?? 0,
          newLeads: 0,
        })
      }
    }

    for (const l of newLeadsData) {
      const existing = repMap.get(l.created_by)
      if (existing) {
        existing.newLeads++
      } else {
        repMap.set(l.created_by, { user_name: '', checkIns: 0, distanceKm: 0, newLeads: 1 })
      }
    }

    const repStats = Array.from(repMap.entries())
      .map(([user_id, stats]) => ({
        user_id,
        user_name: stats.user_name,
        checkIns: stats.checkIns,
        distanceKm: Math.round(stats.distanceKm * 100) / 100,
        newLeads: stats.newLeads,
      }))
      .sort((a, b) => b.checkIns - a.checkIns)

    return NextResponse.json({
      totalLeads: allLeads.length,
      newLeads: newLeadsData.length,
      customers: pipeline['customer'] ?? 0,
      checkIns: visitCheckIns.length,
      pipeline,
      repStats,
    })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

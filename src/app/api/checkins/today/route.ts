import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const todayMidnight = new Date()
    todayMidnight.setHours(0, 0, 0, 0)

    const { data, error } = await supabase
      .from('checkins')
      .select('type, distance_from_previous_km')
      .eq('user_id', user.id)
      .gte('created_at', todayMidnight.toISOString())

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const rows = (data ?? []) as { type: string; distance_from_previous_km: number | null }[]

    const VISIT_TYPES = new Set(['visit', 'demo', 'workshop'])
    const checkInCount = rows.filter(r => VISIT_TYPES.has(r.type)).length
    const totalKm = rows.reduce((sum, r) => sum + (r.distance_from_previous_km ?? 0), 0)

    return NextResponse.json({
      checkInCount,
      totalKm: Math.round(totalKm * 10) / 10,
    })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

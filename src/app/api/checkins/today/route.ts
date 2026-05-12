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

    if (error) {
      console.error('checkins/today query error:', error.message)
      return NextResponse.json({ checkInCount: 0, totalKm: 0 })
    }

    const rows = (data ?? []) as { type: string; distance_from_previous_km: number | null }[]

    const VISIT_TYPES = new Set(['visit', 'demo', 'workshop'])
    const checkInCount = rows.filter(r => VISIT_TYPES.has(r.type)).length
    const totalKm = (data ?? []).reduce(
      (sum, c) => sum + ((c as { distance_from_previous_km: number | null }).distance_from_previous_km ?? 0),
      0
    )

    return NextResponse.json({
      checkInCount,
      totalKm: Math.round(totalKm * 10) / 10,
    })
  } catch (e) {
    console.error('checkins/today error:', e)
    return NextResponse.json({ checkInCount: 0, totalKm: 0 })
  }
}

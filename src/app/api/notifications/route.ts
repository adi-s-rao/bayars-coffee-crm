import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const serverClient = await createClient()
    const { data: { user } } = await serverClient.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = createAdminClient()
    const { data: profileData } = await admin
      .from('profiles')
      .select('role, full_name')
      .eq('id', user.id)
      .single()

    const profile = profileData as { role: string; full_name: string } | null
    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const tomorrowStart = new Date(todayStart)
    tomorrowStart.setDate(tomorrowStart.getDate() + 1)

    if (profile.role === 'rep') {
      const { data: scheduled } = await admin
        .from('leads')
        .select('id, cafe_name, scheduled_date, scheduled_type')
        .eq('created_by', user.id)
        .gte('scheduled_date', todayStart.toISOString())
        .lt('scheduled_date', tomorrowStart.toISOString())
        .not('scheduled_date', 'is', null)
        .order('scheduled_date', { ascending: true })

      return NextResponse.json({
        type: 'rep',
        scheduledToday: scheduled ?? [],
      })
    }

    // Manager
    const [flaggedResult, repsResult] = await Promise.all([
      admin
        .from('checkins')
        .select('id, user_id, user_name, type, remarks, created_at, lead_id, leads(cafe_name)')
        .like('remarks', '[FLAGGED:%')
        .gte('created_at', todayStart.toISOString())
        .order('created_at', { ascending: false })
        .limit(10),
      admin
        .from('profiles')
        .select('id, full_name')
        .eq('role', 'rep'),
    ])

    const allReps = (repsResult.data ?? []) as { id: string; full_name: string }[]

    // For each rep, check if they have any checkin today
    const todayCheckinsResult = await admin
      .from('checkins')
      .select('user_id')
      .gte('created_at', todayStart.toISOString())

    const startedUserIds = new Set(
      (todayCheckinsResult.data ?? []).map((c: { user_id: string }) => c.user_id)
    )

    const repsNotStarted = allReps
      .filter(r => !startedUserIds.has(r.id))
      .map(r => ({
        id: r.id,
        full_name: r.full_name,
        initials: r.full_name.split(' ').slice(0, 2).map((n: string) => n[0] ?? '').join('').toUpperCase(),
      }))

    return NextResponse.json({
      type: 'manager',
      flaggedCheckins: flaggedResult.data ?? [],
      repsNotStarted,
    })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

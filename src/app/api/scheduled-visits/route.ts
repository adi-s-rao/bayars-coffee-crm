import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { type NextRequest, NextResponse } from 'next/server'
import type { Profile, ScheduledVisit, VisitType } from '@/types'

const VALID_TYPES: VisitType[] = ['visit', 'demo', 'workshop']

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profileData } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const role = (profileData as Pick<Profile, 'role'> | null)?.role ?? 'rep'

    const admin = createAdminClient()
    let query = admin
      .from('scheduled_visits')
      .select('*, leads(cafe_name, location_address), profiles!scheduled_visits_assigned_to_fkey(full_name)')
      .order('scheduled_date', { ascending: true })

    if (role !== 'manager') {
      query = query.eq('assigned_to', user.id)
    }

    const { data, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ visits: data as ScheduledVisit[] })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profileData } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const role = (profileData as Pick<Profile, 'role'> | null)?.role ?? 'rep'
    if (role !== 'manager') {
      return NextResponse.json({ error: 'Manager access required' }, { status: 403 })
    }

    const body = await request.json() as {
      lead_id: string
      assigned_to: string
      scheduled_date: string
      visit_type: string
      notes?: string
    }

    if (!body.lead_id || !body.assigned_to || !body.scheduled_date || !body.visit_type) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (!(VALID_TYPES as string[]).includes(body.visit_type)) {
      return NextResponse.json({ error: 'Invalid visit_type' }, { status: 400 })
    }

    const admin = createAdminClient()
    const { data, error } = await admin
      .from('scheduled_visits')
      .insert({
        lead_id: body.lead_id,
        assigned_to: body.assigned_to,
        scheduled_date: body.scheduled_date,
        visit_type: body.visit_type as VisitType,
        notes: body.notes ?? null,
        created_by: user.id,
      })
      .select('*, leads(cafe_name, location_address), profiles!scheduled_visits_assigned_to_fkey(full_name)')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ visit: data })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

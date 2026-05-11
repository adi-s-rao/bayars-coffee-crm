import { createClient } from '@/lib/supabase/server'
import { type NextRequest, NextResponse } from 'next/server'
import type { LeadStatus, Profile } from '@/types'

const VALID_STATUSES: LeadStatus[] = [
  'cold_lead', 'hot_lead', 'demo_scheduled', 'customer', 'competitor',
]

function isValidStatus(s: string): s is LeadStatus {
  return (VALID_STATUSES as string[]).includes(s)
}

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const p = profile as Pick<Profile, 'role'> | null
    const isManager = p?.role === 'manager'

    const query = supabase
      .from('leads')
      .select('*')
      .order('updated_at', { ascending: false })

    const { data, error } = isManager
      ? await query
      : await query.eq('created_by', user.id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ leads: data ?? [] })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json() as Record<string, unknown>

    if (!body.cafe_name || typeof body.cafe_name !== 'string') {
      return NextResponse.json({ error: 'cafe_name is required' }, { status: 400 })
    }

    const status = (body.status as string | undefined) ?? 'cold_lead'
    if (!isValidStatus(status)) {
      return NextResponse.json({ error: 'Invalid status value' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('leads')
      .insert({
        cafe_name: body.cafe_name as string,
        status,
        created_by: user.id,
        latitude: (body.latitude as number | undefined) ?? null,
        longitude: (body.longitude as number | undefined) ?? null,
        location_address: (body.location_address as string | undefined) ?? null,
        poc_name: (body.poc_name as string | undefined) ?? null,
        poc_contact: (body.poc_contact as string | undefined) ?? null,
        remarks: (body.remarks as string | undefined) ?? null,
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ lead: data }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

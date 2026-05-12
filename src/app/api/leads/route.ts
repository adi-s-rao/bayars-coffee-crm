import { createAdminClient } from '@/lib/supabase/admin'
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

    const adminClient = createAdminClient()
    const query = adminClient
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
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    console.log('LEADS POST - auth check:', {
      userId: user?.id,
      authError: authError?.message
    })

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    console.log('LEADS POST - request body:', JSON.stringify(body))

    // Upsert profile first using service role
    const adminClient = createAdminClient()
    const { error: profileError } = await adminClient
      .from('profiles')
      .upsert({
        id: user.id,
        email: user.email ?? '',
        full_name: user.user_metadata?.full_name ??
                   user.email?.split('@')[0] ?? 'User',
        role: 'rep',
      }, { onConflict: 'id', ignoreDuplicates: true })

    console.log('LEADS POST - profile upsert:', {
      error: profileError?.message,
      code: profileError?.code
    })

    const leadData = {
      created_by: user.id,
      cafe_name: body.cafe_name,
      status: body.status ?? 'cold_lead',
      latitude: body.latitude ?? null,
      longitude: body.longitude ?? null,
      location_address: body.location_address ?? null,
      poc_name: body.poc_name ?? null,
      poc_contact: body.poc_contact ?? null,
      remarks: body.remarks ?? null,
    }

    console.log('LEADS POST - inserting lead:', JSON.stringify(leadData))

    const { data, error: insertError } = await adminClient
      .from('leads')
      .insert(leadData)
      .select()
      .single()

    console.log('LEADS POST - insert result:', {
      data: data?.id,
      error: insertError?.message,
      code: insertError?.code,
      details: insertError?.details,
      hint: insertError?.hint
    })

    if (insertError) {
      return NextResponse.json({
        error: insertError.message,
        code: insertError.code,
        details: insertError.details,
        hint: insertError.hint
      }, { status: 500 })
    }

    return NextResponse.json({ lead: data })

  } catch (e) {
    console.error('LEADS POST - caught exception:', e)
    return NextResponse.json({
      error: e instanceof Error ? e.message : 'Unknown error',
      stack: e instanceof Error ? e.stack : null
    }, { status: 500 })
  }
}

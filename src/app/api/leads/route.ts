import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { type NextRequest, NextResponse } from 'next/server'
import type { LeadStatus } from '@/types'

const VALID_STATUSES: LeadStatus[] = ['cold_lead', 'hot_lead', 'customer', 'competitor']

function isValidStatus(s: string): s is LeadStatus {
  return (VALID_STATUSES as string[]).includes(s)
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2
  return R * 2 * Math.asin(Math.sqrt(a))
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const page = Math.max(0, parseInt(searchParams.get('page') ?? '0'))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '20')))
    const search = searchParams.get('search') ?? ''
    const status = searchParams.get('status') ?? ''

    const adminClient = createAdminClient()
    let query = adminClient
      .from('leads')
      .select('*', { count: 'exact' })
      .order('updated_at', { ascending: false })
      .range(page * limit, (page + 1) * limit - 1)

    if (search) {
      query = query.ilike('cafe_name', `%${search}%`)
    }
    if (status && isValidStatus(status)) {
      query = query.eq('status', status)
    }

    const { data, error, count } = await query

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const total = count ?? 0
    const hasMore = (page + 1) * limit < total

    return NextResponse.json({ leads: data ?? [], total, hasMore, page })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

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

    if (profileError) {
      console.error('LEADS POST - profile upsert error:', profileError.message)
    }

    const leadData = {
      created_by: user.id,
      cafe_name: body.cafe_name,
      status: body.status ?? 'cold_lead',
      latitude: body.latitude ?? null,
      longitude: body.longitude ?? null,
      location_address: body.location_address ?? null,
      poc_name: body.poc_name ?? null,
      poc_contact: body.poc_contact ?? null,
      coffee_machine: body.coffee_machine ?? null,
      current_bean_brand: body.current_bean_brand ?? null,
      bean_usage_kg: body.bean_usage_kg ?? null,
      cappuccino_price: body.cappuccino_price ?? null,
      remarks: body.remarks ?? null,
      sample_name: body.sample_name ?? null,
      sample_quantity_grams: body.sample_quantity_grams ?? null,
    }

    const { data, error: insertError } = await adminClient
      .from('leads')
      .insert(leadData)
      .select()
      .single()

    if (insertError) {
      return NextResponse.json({
        error: insertError.message,
        code: insertError.code,
        details: insertError.details,
      }, { status: 500 })
    }

    // Auto-insert a new_lead checkin if GPS was provided
    if (body.latitude != null && body.longitude != null) {
      const todayStart = new Date()
      todayStart.setHours(0, 0, 0, 0)

      const { data: prev } = await adminClient
        .from('checkins')
        .select('latitude, longitude')
        .eq('user_id', user.id)
        .gte('created_at', todayStart.toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      const prevRow = prev as { latitude: number | null; longitude: number | null } | null
      let distanceKm: number | null = null
      if (prevRow?.latitude != null && prevRow?.longitude != null) {
        distanceKm = Math.round(
          haversineKm(prevRow.latitude, prevRow.longitude, body.latitude, body.longitude) * 100
        ) / 100
      }

      const userName = user.user_metadata?.full_name as string | undefined
        ?? user.email?.split('@')[0]
        ?? 'User'

      await adminClient.from('checkins').insert({
        type: 'new_lead',
        lead_id: data.id,
        user_id: user.id,
        user_name: userName,
        latitude: body.latitude,
        longitude: body.longitude,
        distance_from_previous_km: distanceKm,
        remarks: `New lead: ${body.cafe_name}`,
      })
    }

    return NextResponse.json({ lead: data })

  } catch (e) {
    console.error('LEADS POST - caught exception:', e)
    return NextResponse.json({
      error: e instanceof Error ? e.message : 'Unknown error',
    }, { status: 500 })
  }
}

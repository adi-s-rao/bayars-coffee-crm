import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { type NextRequest, NextResponse } from 'next/server'
import type { CheckInType } from '@/types'

const VALID_TYPES: CheckInType[] = ['visit', 'demo', 'workshop', 'start_day', 'end_day']

function isValidType(t: string): t is CheckInType {
  return (VALID_TYPES as string[]).includes(t)
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

interface CheckInBody {
  type: string
  latitude?: number
  longitude?: number
  lead_id?: string
  user_id: string
  user_name: string
  remarks?: string
  gate_pass_number?: string
  beans_used?: boolean
  bean_brand?: string
  bean_amount_kg?: number
  geofence_flagged?: boolean
  geofence_distance_m?: number
}

export async function POST(request: NextRequest) {
  try {
    // Verify authenticated session
    const serverClient = await createClient()
    const { data: { user } } = await serverClient.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json() as CheckInBody

    if (!isValidType(body.type)) {
      return NextResponse.json({ error: 'Invalid checkin type' }, { status: 400 })
    }

    // Security: user can only log checkins for themselves
    if (body.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const admin = createAdminClient()

    // Ensure profiles row exists before inserting — checkins.user_id has a
    // FK → profiles(id). Same issue as leads: users pre-trigger have no row.
    await admin.from('profiles').upsert({
      id: user.id,
      email: user.email ?? '',
      full_name: (user.user_metadata?.full_name as string | undefined)
        ?? user.email?.split('@')[0]
        ?? 'User',
      role: 'rep',
    }, { onConflict: 'id', ignoreDuplicates: true })

    let distanceKm: number | null = null

    // Calculate distance from previous checkin TODAY only (skip for start_day)
    if (body.type !== 'start_day' && body.latitude != null && body.longitude != null) {
      const todayStart = new Date()
      todayStart.setHours(0, 0, 0, 0)

      const { data: prev } = await admin
        .from('checkins')
        .select('latitude, longitude, created_at')
        .eq('user_id', body.user_id)
        .gte('created_at', todayStart.toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      const prevRow = prev as { latitude: number | null; longitude: number | null } | null
      if (prevRow?.latitude != null && prevRow?.longitude != null) {
        distanceKm = Math.round(
          haversineKm(prevRow.latitude, prevRow.longitude, body.latitude, body.longitude) * 100
        ) / 100
      }
    }

    // Prepend geofence flag to remarks when the rep checked in from outside the radius
    const flagPrefix = body.geofence_flagged && body.geofence_distance_m
      ? `[FLAGGED: ${body.geofence_distance_m}m away] `
      : ''
    const finalRemarks = flagPrefix
      ? `${flagPrefix}${body.remarks ?? ''}`.trim()
      : (body.remarks ?? null)

    const { data, error } = await admin
      .from('checkins')
      .insert({
        type: body.type,
        latitude: body.latitude ?? null,
        longitude: body.longitude ?? null,
        lead_id: body.lead_id ?? null,
        user_id: body.user_id,
        user_name: body.user_name,
        remarks: finalRemarks,
        gate_pass_number: body.gate_pass_number ?? null,
        beans_used: body.beans_used ?? false,
        bean_brand: body.bean_brand ?? null,
        bean_amount_kg: body.bean_amount_kg ?? null,
        distance_from_previous_km: distanceKm,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // If this check-in is tied to a lead, bump updated_at so "Last visit"
    // reflects the visit time, then return the refreshed lead to the client.
    let updatedLead = null
    if (body.lead_id && body.type !== 'start_day' && body.type !== 'end_day') {
      await admin
        .from('leads')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', body.lead_id)
      const { data: leadData } = await admin
        .from('leads')
        .select('*')
        .eq('id', body.lead_id)
        .single()
      updatedLead = leadData
    }

    return NextResponse.json({ success: true, checkin: data, lead: updatedLead })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

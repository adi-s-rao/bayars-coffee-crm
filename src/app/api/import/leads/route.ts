import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { type NextRequest, NextResponse } from 'next/server'
import type { LeadStatus } from '@/types'

const STATUS_MAP: Record<string, LeadStatus> = {
  hot: 'hot_lead',
  'hot lead': 'hot_lead',
  cold: 'cold_lead',
  'cold lead': 'cold_lead',
  demo: 'demo_scheduled',
  'demo scheduled': 'demo_scheduled',
  customer: 'customer',
  competitor: 'competitor',
  hot_lead: 'hot_lead',
  cold_lead: 'cold_lead',
  demo_scheduled: 'demo_scheduled',
}

function normaliseStatus(raw: string): LeadStatus {
  const key = raw.trim().toLowerCase()
  return STATUS_MAP[key] ?? 'cold_lead'
}

interface MappedRow {
  cafe_name?: string
  status?: string
  location_address?: string
  poc_name?: string
  poc_contact?: string
  coffee_machine?: string
  current_bean_brand?: string
  bean_usage_kg?: string
  bean_price_per_kg?: string
  cappuccino_price?: string
  remarks?: string
}

export async function POST(request: NextRequest) {
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

    const body = await request.json() as { rows: MappedRow[] }
    const { rows } = body

    if (!rows || rows.length === 0) {
      return NextResponse.json({ error: 'No rows to import' }, { status: 400 })
    }

    const toInsert = rows
      .filter(r => r.cafe_name?.trim())
      .map(r => ({
        created_by: user.id,
        cafe_name: r.cafe_name!.trim(),
        status: normaliseStatus(r.status ?? 'cold'),
        location_address: r.location_address?.trim() || null,
        poc_name: r.poc_name?.trim() || null,
        poc_contact: r.poc_contact?.trim() || null,
        coffee_machine: r.coffee_machine?.trim() || null,
        current_bean_brand: r.current_bean_brand?.trim() || null,
        bean_usage_kg: r.bean_usage_kg ? parseFloat(r.bean_usage_kg) || null : null,
        bean_price_per_kg: r.bean_price_per_kg ? parseFloat(r.bean_price_per_kg) || null : null,
        cappuccino_price: r.cappuccino_price ? parseFloat(r.cappuccino_price) || null : null,
        remarks: r.remarks?.trim() || null,
      }))

    const BATCH = 50
    let imported = 0
    const errors: string[] = []

    for (let i = 0; i < toInsert.length; i += BATCH) {
      const batch = toInsert.slice(i, i + BATCH)
      const { error } = await admin.from('leads').insert(batch)
      if (error) {
        errors.push(`Rows ${i + 1}–${i + batch.length}: ${error.message}`)
      } else {
        imported += batch.length
      }
    }

    return NextResponse.json({ imported, failed: toInsert.length - imported, errors })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

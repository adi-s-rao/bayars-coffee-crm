import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { type NextRequest, NextResponse } from 'next/server'
import type { Profile } from '@/types'

type RouteContext = { params: Promise<{ id: string }> }

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json() as Record<string, unknown>
    const { id: _id, created_by: _cb, created_at: _ca, ...updateFields } = body

    const admin = createAdminClient()

    // Reps can only update visits assigned to them; managers can update any
    const { data: profileData } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    const role = (profileData as Pick<Profile, 'role'> | null)?.role ?? 'rep'

    let query = admin
      .from('scheduled_visits')
      .update(updateFields)
      .eq('id', id)

    if (role !== 'manager') {
      query = query.eq('assigned_to', user.id)
    }

    const { data, error } = await query.select().single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ visit: data })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profileData } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    const role = (profileData as Pick<Profile, 'role'> | null)?.role ?? 'rep'

    if (role !== 'manager') {
      return NextResponse.json({ error: 'Manager access required' }, { status: 403 })
    }

    const admin = createAdminClient()
    const { error } = await admin.from('scheduled_visits').delete().eq('id', id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

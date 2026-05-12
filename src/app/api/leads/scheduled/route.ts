import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { Profile } from '@/types'

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
    const query = admin
      .from('leads')
      .select('*')
      .not('scheduled_date', 'is', null)
      .order('scheduled_date', { ascending: true })

    const { data, error } = role === 'manager'
      ? await query
      : await query.eq('created_by', user.id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ leads: data ?? [] })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

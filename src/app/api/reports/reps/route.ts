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
      .select('role')
      .eq('id', user.id)
      .single()

    if ((profileData as { role: string } | null)?.role !== 'manager') {
      return NextResponse.json({ error: 'Manager access required' }, { status: 403 })
    }

    const { data } = await admin
      .from('profiles')
      .select('id, full_name')
      .eq('role', 'rep')
      .order('full_name', { ascending: true })

    const reps = (data ?? []).map((r: { id: string; full_name: string }) => ({
      id: r.id,
      full_name: r.full_name,
      initials: r.full_name.split(' ').slice(0, 2).map((n: string) => n[0] ?? '').join('').toUpperCase(),
    }))

    return NextResponse.json({ reps })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

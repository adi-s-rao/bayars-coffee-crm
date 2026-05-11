import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import LeadListView from '@/components/dashboard/LeadListView'
import type { Lead, Profile, UserRole } from '@/types'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profileData } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  // Use synthetic profile if DB row missing — same pattern as layout.tsx.
  // Never redirect to /login here: the user IS authenticated, only the
  // profiles row is absent (trigger hadn't fired for older accounts).
  const profile: Profile = (profileData as Profile | null) ?? {
    id: user.id,
    full_name: (user.user_metadata?.full_name as string) ??
               user.email?.split('@')[0] ?? 'User',
    email: user.email ?? '',
    role: 'rep' as UserRole,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  const query = supabase
    .from('leads')
    .select('*')
    .order('updated_at', { ascending: false })

  const { data: leadsData } = profile.role === 'manager'
    ? await query
    : await query.eq('created_by', user.id)

  const leads = (leadsData ?? []) as Lead[]

  return <LeadListView leads={leads} profile={profile} />
}

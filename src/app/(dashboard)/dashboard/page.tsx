import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import LeadListView from '@/components/dashboard/LeadListView'
import type { Profile, UserRole } from '@/types'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profileData } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const profile: Profile = (profileData as Profile | null) ?? {
    id: user.id,
    full_name: (user.user_metadata?.full_name as string) ??
               user.email?.split('@')[0] ?? 'User',
    email: user.email ?? '',
    role: 'rep' as UserRole,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  return <LeadListView profile={profile} />
}

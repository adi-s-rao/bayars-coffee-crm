export const revalidate = 0

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import MapView from '@/components/dashboard/MapView'
import type { Lead, Profile, UserRole } from '@/types'

export default async function MapPage() {
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
    full_name:
      (user.user_metadata?.full_name as string) ??
      user.email?.split('@')[0] ??
      'User',
    email: user.email ?? '',
    role: 'rep' as UserRole,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  const admin = createAdminClient()
  const leadsQuery = admin
    .from('leads')
    .select('*')
    .order('updated_at', { ascending: false })

  const { data: leadsData } =
    profile.role === 'manager'
      ? await leadsQuery
      : await leadsQuery.eq('created_by', user.id)

  const leads = (leadsData ?? []) as Lead[]

  return <MapView leads={leads} profile={profile} />
}

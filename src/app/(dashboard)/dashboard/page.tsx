import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import LeadListView from '@/components/dashboard/LeadListView'
import type { Lead, Profile } from '@/types'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profileData } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const profile = profileData as Profile | null
  if (!profile) redirect('/login')

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

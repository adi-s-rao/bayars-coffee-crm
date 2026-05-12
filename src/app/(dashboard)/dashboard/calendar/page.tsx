import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import CalendarView from '@/components/dashboard/CalendarView'
import type { Lead, Profile, UserRole } from '@/types'

export default async function CalendarPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profileData } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const role =
    (profileData as Pick<Profile, 'role'> | null)?.role ?? ('rep' as UserRole)

  const admin = createAdminClient()
  const leadsQuery = admin
    .from('leads')
    .select('*')
    .not('scheduled_date', 'is', null)
    .order('scheduled_date', { ascending: true })

  const { data: leadsData } =
    role === 'manager'
      ? await leadsQuery
      : await leadsQuery.eq('created_by', user.id)

  const leads = (leadsData ?? []) as Lead[]

  return <CalendarView leads={leads} />
}

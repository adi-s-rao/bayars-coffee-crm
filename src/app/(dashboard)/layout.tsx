import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import DashboardShell from '@/components/dashboard/DashboardShell'
import type { Profile, UserRole } from '@/types'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const dbProfile = data as Profile | null

  if (!dbProfile) {
    console.warn('Profile missing for user:', user.id)
  }

  const profile: Profile = dbProfile ?? {
    id: user.id,
    full_name:
      (user.user_metadata?.full_name as string | undefined) ??
      user.email?.split('@')[0] ??
      'User',
    email: user.email ?? '',
    role: 'rep' as UserRole,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  return <DashboardShell profile={profile}>{children}</DashboardShell>
}

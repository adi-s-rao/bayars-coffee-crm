import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import DashboardShell from '@/components/dashboard/DashboardShell'
import type { Profile } from '@/types'

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

  // If the profiles row is missing (migration not yet applied, or trigger didn't
  // fire), fall back to basic info from the auth user rather than redirecting to
  // /login — that would loop an authenticated user back to the login page.
  const profile: Profile = (data as Profile | null) ?? {
    id: user.id,
    full_name:
      (user.user_metadata?.full_name as string | undefined) ??
      user.email?.split('@')[0] ??
      'User',
    email: user.email ?? '',
    role: 'rep',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  return <DashboardShell profile={profile}>{children}</DashboardShell>
}

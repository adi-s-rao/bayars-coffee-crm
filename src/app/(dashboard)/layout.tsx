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

  let profile: Profile | null = null

  try {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    profile = data as Profile | null
  } catch {
    // profile stays null — synthetic fallback applied below
  }

  const finalProfile: Profile = profile ?? {
    id: user.id,
    full_name: (user.user_metadata?.full_name as string) ??
               user.email?.split('@')[0] ?? 'User',
    email: user.email ?? '',
    role: 'rep' as UserRole,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  return <DashboardShell profile={finalProfile}>{children}</DashboardShell>
}

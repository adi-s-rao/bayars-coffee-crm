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

  const { data: { user }, error } = await supabase.auth.getUser()

  console.log('LAYOUT getUser result:', {
    userId: user?.id,
    email: user?.email,
    error: error?.message
  })

  if (!user) {
    console.log('LAYOUT: no user, redirecting to login')
    redirect('/login')
  }

  let profile: Profile | null = null

  try {
    const { data, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    console.log('LAYOUT profile fetch:', { data, error: profileError?.message })
    profile = data as Profile | null
  } catch (e) {
    console.log('LAYOUT profile fetch threw:', e)
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

  console.log('LAYOUT: rendering dashboard for', finalProfile.email)

  return <DashboardShell profile={finalProfile}>{children}</DashboardShell>
}

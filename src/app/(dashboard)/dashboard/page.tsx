import { redirect } from 'next/navigation'
import { Coffee, LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { Profile } from '@/types'

async function getProfile(): Promise<Profile | null> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return data as Profile | null
}

export default async function DashboardPage() {
  const profile = await getProfile()

  if (!profile) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <Coffee className="h-5 w-5 text-primary" />
            <span className="font-semibold">Bayar&apos;s Coffee CRM</span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-sm font-medium">{profile.full_name}</span>
            <Badge variant={profile.role === 'manager' ? 'default' : 'secondary'}>
              {profile.role}
            </Badge>

            <form action="/api/auth/signout" method="POST">
              <Button type="submit" variant="ghost" size="sm" className="gap-2">
                <LogOut className="h-4 w-4" />
                Sign out
              </Button>
            </form>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="mx-auto max-w-7xl px-6 py-16">
        <div className="flex flex-col items-center gap-4 text-center">
          <Coffee className="h-12 w-12 text-muted-foreground/40" />
          <h1 className="text-2xl font-semibold">
            Welcome back, {profile.full_name.split(' ')[0]}!
          </h1>
          <p className="text-muted-foreground">
            Dashboard features are coming soon. Stay tuned.
          </p>
        </div>
      </main>
    </div>
  )
}

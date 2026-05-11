'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Coffee, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()

  // Sign-in state
  const [signInEmail, setSignInEmail] = useState('')
  const [signInPassword, setSignInPassword] = useState('')
  const [signInLoading, setSignInLoading] = useState(false)
  const [signInError, setSignInError] = useState('')

  // Sign-up state
  const [signUpName, setSignUpName] = useState('')
  const [signUpEmail, setSignUpEmail] = useState('')
  const [signUpPassword, setSignUpPassword] = useState('')
  const [signUpLoading, setSignUpLoading] = useState(false)
  const [signUpError, setSignUpError] = useState('')
  const [signUpSuccess, setSignUpSuccess] = useState(false)

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault()
    setSignInLoading(true)
    setSignInError('')

    const { error } = await supabase.auth.signInWithPassword({
      email: signInEmail,
      password: signInPassword,
    })

    if (error) {
      setSignInError(error.message)
      setSignInLoading(false)
      return
    }

    router.push('/dashboard')
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault()
    setSignUpLoading(true)
    setSignUpError('')

    const { error } = await supabase.auth.signUp({
      email: signUpEmail,
      password: signUpPassword,
      options: {
        data: { full_name: signUpName },
      },
    })

    if (error) {
      setSignUpError(error.message)
      setSignUpLoading(false)
      return
    }

    setSignUpSuccess(true)
    setSignUpLoading(false)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-[400px]">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center gap-2 text-center">
          <div className="flex items-center gap-2">
            <Coffee className="h-7 w-7 text-primary" />
            <span className="text-xl font-bold tracking-tight">
              Bayar&apos;s Coffee CRM
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            Sales force automation for your cafe team
          </p>
        </div>

        {/* Card */}
        <div className="rounded-xl border bg-card shadow-sm">
          <div className="p-6">
            <Tabs defaultValue="signin">
              <TabsList className="mb-6 w-full">
                <TabsTrigger value="signin" className="flex-1">
                  Sign In
                </TabsTrigger>
                <TabsTrigger value="signup" className="flex-1">
                  Sign Up
                </TabsTrigger>
              </TabsList>

              {/* ── Sign In ── */}
              <TabsContent value="signin">
                <form onSubmit={handleSignIn} className="flex flex-col gap-5">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="signin-email">Email</Label>
                    <Input
                      id="signin-email"
                      type="email"
                      placeholder="you@example.com"
                      autoComplete="email"
                      required
                      value={signInEmail}
                      onChange={(e) => setSignInEmail(e.target.value)}
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <Label htmlFor="signin-password">Password</Label>
                    <Input
                      id="signin-password"
                      type="password"
                      placeholder="••••••••"
                      autoComplete="current-password"
                      required
                      value={signInPassword}
                      onChange={(e) => setSignInPassword(e.target.value)}
                    />
                  </div>

                  {signInError && (
                    <p className="text-sm text-destructive">{signInError}</p>
                  )}

                  <Button type="submit" className="w-full" disabled={signInLoading}>
                    {signInLoading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    Sign In
                  </Button>
                </form>

                <p className="mt-5 text-center text-xs text-muted-foreground">
                  Contact your manager if you don&apos;t have an account.
                </p>
              </TabsContent>

              {/* ── Sign Up ── */}
              <TabsContent value="signup">
                {signUpSuccess ? (
                  <div className="flex flex-col items-center gap-3 py-4 text-center">
                    <Coffee className="h-8 w-8 text-primary" />
                    <p className="font-semibold">Check your email!</p>
                    <p className="text-sm text-muted-foreground">
                      We&apos;ve sent a confirmation link to{' '}
                      <span className="font-medium text-foreground">
                        {signUpEmail}
                      </span>
                      . Click it to activate your account.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleSignUp} className="flex flex-col gap-5">
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="signup-name">Full Name</Label>
                      <Input
                        id="signup-name"
                        type="text"
                        placeholder="Adith Rao"
                        autoComplete="name"
                        required
                        value={signUpName}
                        onChange={(e) => setSignUpName(e.target.value)}
                      />
                    </div>

                    <div className="flex flex-col gap-2">
                      <Label htmlFor="signup-email">Email</Label>
                      <Input
                        id="signup-email"
                        type="email"
                        placeholder="you@example.com"
                        autoComplete="email"
                        required
                        value={signUpEmail}
                        onChange={(e) => setSignUpEmail(e.target.value)}
                      />
                    </div>

                    <div className="flex flex-col gap-2">
                      <Label htmlFor="signup-password">Password</Label>
                      <Input
                        id="signup-password"
                        type="password"
                        placeholder="••••••••"
                        autoComplete="new-password"
                        minLength={6}
                        required
                        value={signUpPassword}
                        onChange={(e) => setSignUpPassword(e.target.value)}
                      />
                    </div>

                    {signUpError && (
                      <p className="text-sm text-destructive">{signUpError}</p>
                    )}

                    <Button
                      type="submit"
                      className="w-full"
                      disabled={signUpLoading}
                    >
                      {signUpLoading ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : null}
                      Create Account
                    </Button>
                  </form>
                )}

                {!signUpSuccess && (
                  <p className="mt-5 text-center text-xs text-muted-foreground">
                    By signing up you agree to use this app for Bayar&apos;s
                    Coffee sales activities only.
                  </p>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  )
}

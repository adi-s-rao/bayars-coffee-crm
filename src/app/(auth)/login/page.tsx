'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertCircle, CheckCircle2, Coffee, Eye, EyeOff, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

type Tab = 'signin' | 'signup'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()

  const [tab, setTab] = useState<Tab>('signin')
  const signInRef = useRef<HTMLButtonElement>(null)
  const signUpRef = useRef<HTMLButtonElement>(null)
  const [underline, setUnderline] = useState({ left: 0, width: 0 })

  // Sign-in state
  const [siEmail, setSiEmail] = useState('')
  const [siPassword, setSiPassword] = useState('')
  const [siShowPw, setSiShowPw] = useState(false)
  const [siLoading, setSiLoading] = useState(false)
  const [siError, setSiError] = useState('')

  // Sign-up state
  const [suName, setSuName] = useState('')
  const [suEmail, setSuEmail] = useState('')
  const [suPassword, setSuPassword] = useState('')
  const [suShowPw, setSuShowPw] = useState(false)
  const [suLoading, setSuLoading] = useState(false)
  const [suError, setSuError] = useState('')
  const [suSuccess, setSuSuccess] = useState(false)

  // Measure underline position on tab change
  useEffect(() => {
    const ref = tab === 'signin' ? signInRef : signUpRef
    if (ref.current) {
      setUnderline({ left: ref.current.offsetLeft, width: ref.current.offsetWidth })
    }
  }, [tab])

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault()
    setSiLoading(true)
    setSiError('')
    const { data, error } = await supabase.auth.signInWithPassword({ email: siEmail, password: siPassword })
    console.log('Sign in result:', { data, error })
    if (error) { setSiError(error.message); setSiLoading(false); return }
    router.refresh()
    router.push('/dashboard')
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault()
    setSuLoading(true)
    setSuError('')
    const { error } = await supabase.auth.signUp({
      email: suEmail,
      password: suPassword,
      options: { data: { full_name: suName } },
    })
    if (error) { setSuError(error.message); setSuLoading(false); return }
    setSuSuccess(true)
    setSuLoading(false)
  }

  const suCanSubmit = suName.trim().length > 0 && suEmail.trim().length > 0 && suPassword.length >= 8

  const inputClass =
    'w-full bg-[#111111] border border-[#2A2A2A] rounded-lg px-3 py-2.5 text-sm text-white outline-none transition-colors placeholder:text-[#555] focus:border-[#D97706] focus:ring-2 focus:ring-amber-600/15'
  const labelClass = 'block text-[12px] font-medium text-[#A0A0A0] mb-1.5'
  const btnAmber =
    'w-full bg-[#D97706] hover:bg-[#B45309] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg py-2.5 text-sm font-semibold transition-colors flex items-center justify-center gap-2'

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#0F0F0F] px-6">
      {/* Card */}
      <div className="w-full max-w-[420px] rounded-2xl border border-[#2A2A2A] bg-[#1A1A1A] p-8">
        {/* Brand */}
        <div className="mb-2 flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-amber-600/25 bg-amber-600/10">
            <Coffee size={15} color="#D97706" />
          </div>
          <span>
            <span className="text-base font-bold text-white">Bayar&apos;s Coffee</span>
            <span className="ml-1 text-base font-medium text-[#7A7A7A]">CRM</span>
          </span>
        </div>
        <p className="mb-7 text-[13px] text-[#7A7A7A]">Field Sales Platform</p>

        {/* Tab switcher */}
        <div className="relative mb-6 flex gap-6 border-b border-[#2A2A2A]">
          <button
            ref={signInRef}
            type="button"
            onClick={() => setTab('signin')}
            className={`pb-3 text-sm transition-colors ${tab === 'signin' ? 'font-medium text-white' : 'text-[#7A7A7A]'}`}
          >
            Sign In
          </button>
          <button
            ref={signUpRef}
            type="button"
            onClick={() => setTab('signup')}
            className={`pb-3 text-sm transition-colors ${tab === 'signup' ? 'font-medium text-white' : 'text-[#7A7A7A]'}`}
          >
            Sign Up
          </button>
          {/* Animated amber underline */}
          <div
            className="absolute bottom-[-1px] h-0.5 rounded-sm bg-[#D97706] transition-all duration-200"
            style={{ left: underline.left, width: underline.width }}
          />
        </div>

        {/* ── Sign In ── */}
        {tab === 'signin' && (
          <form onSubmit={handleSignIn} className="flex flex-col gap-4">
            <div>
              <label htmlFor="si-email" className={labelClass}>Email</label>
              <input
                id="si-email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                required
                value={siEmail}
                onChange={e => setSiEmail(e.target.value)}
                className={inputClass}
              />
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label htmlFor="si-password" className={labelClass.replace('mb-1.5', '')}>Password</label>
                <button
                  type="button"
                  className="text-[12px] font-medium text-[#D97706] hover:text-[#B45309] transition-colors"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <input
                  id="si-password"
                  type={siShowPw ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  required
                  value={siPassword}
                  onChange={e => setSiPassword(e.target.value)}
                  className={`${inputClass} pr-10`}
                />
                <button
                  type="button"
                  onClick={() => setSiShowPw(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#555] hover:text-[#A0A0A0] transition-colors"
                  tabIndex={-1}
                >
                  {siShowPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {siError && (
              <p className="flex items-center gap-1.5 text-[13px] text-red-400">
                <AlertCircle size={14} />
                {siError}
              </p>
            )}

            <button type="submit" disabled={siLoading} className={btnAmber}>
              {siLoading && <Loader2 size={16} className="animate-spin" />}
              {siLoading ? 'Signing in…' : 'Sign In'}
            </button>

            <p className="text-center text-[13px] text-[#7A7A7A]">
              New to Bayar&apos;s Coffee?{' '}
              <button
                type="button"
                onClick={() => setTab('signup')}
                className="font-medium text-[#D97706] hover:text-[#B45309] transition-colors"
              >
                Create an account
              </button>
            </p>
          </form>
        )}

        {/* ── Sign Up ── */}
        {tab === 'signup' && (
          <>
            {suSuccess ? (
              <div className="flex flex-col items-center gap-3 py-6 text-center">
                <CheckCircle2 size={48} className="text-green-400" />
                <h3 className="text-lg font-semibold text-white">Account created!</h3>
                <p className="text-[14px] text-[#7A7A7A]">
                  Check your email to confirm your account.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSignUp} className="flex flex-col gap-4">
                <div>
                  <label htmlFor="su-name" className={labelClass}>Full Name</label>
                  <input
                    id="su-name"
                    type="text"
                    autoComplete="name"
                    placeholder="Adith Rao"
                    required
                    value={suName}
                    onChange={e => setSuName(e.target.value)}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label htmlFor="su-email" className={labelClass}>Email</label>
                  <input
                    id="su-email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    required
                    value={suEmail}
                    onChange={e => setSuEmail(e.target.value)}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label htmlFor="su-password" className={labelClass}>Password</label>
                  <div className="relative">
                    <input
                      id="su-password"
                      type={suShowPw ? 'text' : 'password'}
                      autoComplete="new-password"
                      placeholder="••••••••"
                      minLength={8}
                      required
                      value={suPassword}
                      onChange={e => setSuPassword(e.target.value)}
                      className={`${inputClass} pr-10`}
                    />
                    <button
                      type="button"
                      onClick={() => setSuShowPw(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#555] hover:text-[#A0A0A0] transition-colors"
                      tabIndex={-1}
                    >
                      {suShowPw ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {suError && (
                  <p className="flex items-center gap-1.5 text-[13px] text-red-400">
                    <AlertCircle size={14} />
                    {suError}
                  </p>
                )}

                <button type="submit" disabled={suLoading || !suCanSubmit} className={btnAmber}>
                  {suLoading && <Loader2 size={16} className="animate-spin" />}
                  {suLoading ? 'Creating account…' : 'Create Account'}
                </button>

                <p className="text-center text-[13px] text-[#7A7A7A]">
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => setTab('signin')}
                    className="font-medium text-[#D97706] hover:text-[#B45309] transition-colors"
                  >
                    Sign in
                  </button>
                </p>

                <p className="text-center text-[11px] text-[#555]">
                  By creating an account, you agree to our Terms and Privacy Policy.
                </p>
              </form>
            )}
          </>
        )}
      </div>

      {/* Footer */}
      <p className="mt-5 text-center text-[12px] text-[#444]">Bayar&apos;s Coffee © 2025</p>
    </div>
  )
}

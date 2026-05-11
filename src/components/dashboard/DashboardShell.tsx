'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { BarChart2, Bell, Calendar, Home, Loader2, MapPin, Menu } from 'lucide-react'
import { toast } from 'sonner'
import type { Profile } from '@/types'
import { format } from 'date-fns'

interface DayState {
  started: boolean
  startTime: string
  startCheckinId: string
}

interface Props {
  profile: Profile
  children: React.ReactNode
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map(n => n[0] ?? '')
    .join('')
    .toUpperCase()
}

async function signOut() {
  await fetch('/api/auth/signout', { method: 'POST' })
  window.location.href = '/login'
}

const NAV_ITEMS = [
  { label: 'Home', href: '/dashboard', Icon: Home },
  { label: 'Map', href: '/dashboard/map', Icon: MapPin },
  { label: 'Calendar', href: '/dashboard/calendar', Icon: Calendar },
  { label: 'Reports', href: '/dashboard/reports', Icon: BarChart2 },
]

export default function DashboardShell({ profile, children }: Props) {
  const pathname = usePathname()
  const [dayState, setDayState] = useState<DayState | null>(null)
  const [dayLoading, setDayLoading] = useState(false)

  // Load persisted day state from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('bayars_day_state')
      if (stored) {
        setDayState(JSON.parse(stored) as DayState)
      }
    } catch {
      // ignore parse errors
    }
  }, [])

  function getPosition(): Promise<GeolocationPosition> {
    return new Promise((resolve, reject) =>
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 10000,
      })
    )
  }

  async function handleStartDay() {
    setDayLoading(true)
    let position: GeolocationPosition
    try {
      position = await getPosition()
    } catch {
      toast.error('Location access required to start your day')
      setDayLoading(false)
      return
    }

    try {
      const res = await fetch('/api/checkins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'start_day',
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          user_id: profile.id,
          user_name: profile.full_name,
        }),
      })
      if (!res.ok) throw new Error('Failed')
      const json = await res.json() as { checkin: { id: string } }
      const newState: DayState = {
        started: true,
        startTime: new Date().toISOString(),
        startCheckinId: json.checkin.id,
      }
      localStorage.setItem('bayars_day_state', JSON.stringify(newState))
      setDayState(newState)
      toast.success('Day started! Good luck out there.')
    } catch {
      toast.error('Failed to start day. Please try again.')
    } finally {
      setDayLoading(false)
    }
  }

  async function handleEndDay() {
    setDayLoading(true)
    let position: GeolocationPosition
    try {
      position = await getPosition()
    } catch {
      toast.error('Location access required to end your day')
      setDayLoading(false)
      return
    }

    try {
      const res = await fetch('/api/checkins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'end_day',
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          user_id: profile.id,
          user_name: profile.full_name,
        }),
      })
      if (!res.ok) throw new Error('Failed')
      localStorage.removeItem('bayars_day_state')
      setDayState(null)
      toast.success('Day ended. Great work today!')
    } catch {
      toast.error('Failed to end day. Please try again.')
    } finally {
      setDayLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#0A0A0A]">
      {/* Top Navbar */}
      <header className="sticky top-0 z-30 border-b border-[#1E1E1E] bg-[#141414] px-4 py-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Menu size={18} className="text-[#A0A0A0]" />
            <span className="text-[15px] font-semibold text-white">Bayar&apos;s CRM</span>
          </div>
          <div className="flex items-center gap-3">
            <button type="button" className="text-[#A0A0A0] hover:text-white transition-colors">
              <Bell size={18} />
            </button>
            <button
              type="button"
              onClick={signOut}
              title="Sign out"
              className="flex h-8 w-8 items-center justify-center rounded-full border border-amber-600/30 bg-amber-600/15 hover:border-red-500/40 hover:bg-red-500/10 transition-colors"
            >
              <span className="text-[12px] font-semibold text-[#D97706]">
                {getInitials(profile.full_name)}
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* Day Status Bar */}
      <div
        className={`border-b border-[#1E1E1E] bg-[#141414] px-4 py-2.5 border-l-2 ${
          dayState?.started ? 'border-l-[#22C55E]' : 'border-l-[#555]'
        }`}
      >
        <div className="flex items-center justify-between">
          {dayState?.started ? (
            <div className="flex items-center gap-2">
              {/* Pulsing green dot */}
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#22C55E]" />
              </span>
              <span className="text-[13px] font-medium text-[#E5E5E5]">Day Started</span>
              <span className="text-[#555]">•</span>
              <span className="text-[13px] text-[#7A7A7A]">
                {format(new Date(dayState.startTime), 'h:mm a')}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-[#555]" />
              <span className="text-[13px] text-[#7A7A7A]">Day not started</span>
            </div>
          )}

          <div>
            {dayState?.started ? (
              <button
                type="button"
                onClick={handleEndDay}
                disabled={dayLoading}
                className="flex items-center gap-1.5 rounded-md border border-red-500 px-3 py-1 text-[12px] font-medium text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
              >
                {dayLoading && <Loader2 size={11} className="animate-spin" />}
                End Day
              </button>
            ) : (
              <button
                type="button"
                onClick={handleStartDay}
                disabled={dayLoading}
                className="flex items-center gap-1.5 rounded-md bg-[#22C55E] px-3 py-1 text-[12px] font-medium text-white hover:bg-green-600 transition-colors disabled:opacity-50"
              >
                {dayLoading && <Loader2 size={11} className="animate-spin" />}
                Start Day
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main content */}
      <main className="flex-1">{children}</main>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-[#1E1E1E] bg-[#141414] px-4 py-3">
        <div className="flex items-center justify-around">
          {NAV_ITEMS.map(({ label, href, Icon }) => {
            const active = pathname === href
            return (
              <Link
                key={href}
                href={href}
                className="flex flex-col items-center gap-1 transition-colors"
              >
                <Icon size={20} color={active ? '#D97706' : '#555'} />
                <span
                  className="text-[10px] font-medium"
                  style={{ color: active ? '#D97706' : '#555' }}
                >
                  {label}
                </span>
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}

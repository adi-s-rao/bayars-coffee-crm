'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  BarChart2,
  Bell,
  Calendar,
  Home,
  Loader2,
  LogOut,
  MapPin,
  Menu,
  RefreshCw,
  Settings,
} from 'lucide-react'
import { toast } from 'sonner'
import type { Profile } from '@/types'
import { format } from 'date-fns'
import Sidebar from './Sidebar'
import SettingsModal from './SettingsModal'

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
  { label: 'Home',     href: '/dashboard',          Icon: Home },
  { label: 'Map',      href: '/dashboard/map',      Icon: MapPin },
  { label: 'Calendar', href: '/dashboard/calendar', Icon: Calendar },
  { label: 'Reports',  href: '/dashboard/reports',  Icon: BarChart2 },
]

export default function DashboardShell({ profile, children }: Props) {
  const pathname = usePathname()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [dayState, setDayState] = useState<DayState | null>(null)
  const [dayLoading, setDayLoading] = useState(false)

  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)

  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    try {
      const stored = localStorage.getItem('bayars_day_state')
      if (stored) setDayState(JSON.parse(stored) as DayState)
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsProfileDropdownOpen(false)
      }
    }
    if (isProfileDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isProfileDropdownOpen])

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
    <div className="flex min-h-screen flex-col bg-black">
      {/* Top Navbar — Liquid Glass */}
      <header
        className="relative sticky top-0 z-30 px-4 py-3.5"
        style={{
          background: 'rgba(28,28,30,0.72)',
          backdropFilter: 'blur(40px) saturate(180%)',
          WebkitBackdropFilter: 'blur(40px) saturate(180%)',
          borderBottom: '0.5px solid rgba(255,255,255,0.08)',
        }}
      >
        {isPending && (
          <div className="absolute left-0 right-0 top-0 z-50 h-[2px] bg-[#D97706]" />
        )}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setIsSidebarOpen(true)}
              className="transition-colors active:scale-[0.92]"
              style={{ color: 'rgba(235,235,245,0.6)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            >
              <Menu size={20} />
            </button>
            <span style={{ fontSize: '17px', fontWeight: 600, color: '#FFF' }}>Bayar&apos;s CRM</span>
          </div>
          <div className="flex items-center gap-3">
            <button type="button" style={{ color: 'rgba(235,235,245,0.6)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
              <Bell size={20} />
            </button>

            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setIsProfileDropdownOpen(v => !v)}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-amber-600/40 bg-amber-600/15 transition-colors hover:border-amber-500/60 active:scale-[0.92]"
              >
                <span className="text-[12px] font-semibold text-[#D97706]">
                  {getInitials(profile.full_name)}
                </span>
              </button>

              {isProfileDropdownOpen && (
                <div
                  className="absolute right-0 top-10 z-[100] w-[220px] rounded-2xl py-1 shadow-2xl"
                  style={{
                    background: 'rgba(28,28,30,0.95)',
                    backdropFilter: 'blur(40px) saturate(180%)',
                    WebkitBackdropFilter: 'blur(40px) saturate(180%)',
                    border: '0.5px solid rgba(255,255,255,0.12)',
                  }}
                >
                  <div style={{ borderBottom: '0.5px solid rgba(84,84,88,0.65)', padding: '12px 16px' }}>
                    <p style={{ fontSize: '13px', fontWeight: 600, color: '#FFF' }}>{profile.full_name}</p>
                    <p style={{ fontSize: '11px', color: 'rgba(235,235,245,0.45)' }}>{profile.email}</p>
                  </div>
                  <div className="px-2 py-1">
                    <button
                      type="button"
                      onClick={() => { setIsSettingsOpen(true); setIsProfileDropdownOpen(false) }}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-white/[0.07]"
                      style={{ fontSize: '13px', color: 'rgba(235,235,245,0.6)', background: 'none', border: 'none', cursor: 'pointer' }}
                    >
                      <Settings size={14} />
                      Settings
                    </button>
                    <button
                      type="button"
                      onClick={() => { void signOut(); setIsProfileDropdownOpen(false) }}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-white/[0.07]"
                      style={{ fontSize: '13px', color: 'rgba(235,235,245,0.6)', background: 'none', border: 'none', cursor: 'pointer' }}
                    >
                      <RefreshCw size={14} />
                      Switch User
                    </button>
                    <div style={{ margin: '4px 0', borderTop: '0.5px solid rgba(84,84,88,0.65)' }} />
                    <button
                      type="button"
                      onClick={signOut}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-white/[0.07]"
                      style={{ fontSize: '13px', color: '#FF453A', background: 'none', border: 'none', cursor: 'pointer' }}
                    >
                      <LogOut size={14} />
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Day Status Bar */}
      <div
        style={{
          background: 'rgba(28,28,30,0.72)',
          backdropFilter: 'blur(40px) saturate(180%)',
          WebkitBackdropFilter: 'blur(40px) saturate(180%)',
          borderBottom: '0.5px solid rgba(84,84,88,0.65)',
          height: '44px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 16px',
          flexShrink: 0,
        }}
      >
        {dayState?.started ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: '#30D158',
                boxShadow: '0 0 0 3px rgba(48,209,88,0.2)',
                flexShrink: 0,
              }}
            />
            <span style={{ fontSize: '13px', fontWeight: 500, color: '#E5E5E7' }}>Day Started</span>
            <span style={{ color: 'rgba(84,84,88,0.9)' }}>·</span>
            <span style={{ fontSize: '13px', color: 'rgba(235,235,245,0.45)' }}>
              {format(new Date(dayState.startTime), 'h:mm a')}
            </span>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: 'rgba(84,84,88,0.9)',
                flexShrink: 0,
              }}
            />
            <span style={{ fontSize: '13px', color: 'rgba(235,235,245,0.45)' }}>Day not started</span>
          </div>
        )}
        <div>
          {dayState?.started ? (
            <button
              type="button"
              onClick={handleEndDay}
              disabled={dayLoading}
              className="flex items-center gap-1.5 transition-all active:scale-[0.95]"
              style={{
                background: 'rgba(255,69,58,0.12)',
                border: '0.5px solid rgba(255,69,58,0.3)',
                borderRadius: '20px',
                padding: '6px 16px',
                color: '#FF453A',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                opacity: dayLoading ? 0.5 : 1,
              }}
            >
              {dayLoading && <Loader2 size={11} className="animate-spin" />}
              End Day
            </button>
          ) : (
            <button
              type="button"
              onClick={handleStartDay}
              disabled={dayLoading}
              className="flex items-center gap-1.5 transition-all active:scale-[0.95]"
              style={{
                background: 'rgba(48,209,88,0.15)',
                border: '0.5px solid rgba(48,209,88,0.3)',
                borderRadius: '20px',
                padding: '6px 16px',
                color: '#30D158',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                opacity: dayLoading ? 0.5 : 1,
              }}
            >
              {dayLoading && <Loader2 size={11} className="animate-spin" />}
              Start Day
            </button>
          )}
        </div>
      </div>

      {/* Main content */}
      <main className="flex-1">{children}</main>

      {/* Floating Pill Tab Bar */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-[1000]"
        style={{ padding: '0 21px 21px', pointerEvents: 'none' }}
      >
        <div
          style={{
            display: 'flex',
            height: '64px',
            alignItems: 'center',
            justifyContent: 'space-around',
            padding: '0 8px',
            background: 'rgba(28,28,30,0.82)',
            backdropFilter: 'blur(40px) saturate(180%)',
            WebkitBackdropFilter: 'blur(40px) saturate(180%)',
            border: '0.5px solid rgba(255,255,255,0.12)',
            borderRadius: '24px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            pointerEvents: 'auto',
          }}
        >
          {NAV_ITEMS.map(({ label, href, Icon }) => {
            const active = pathname === href
            return (
              <Link
                key={href}
                href={href}
                prefetch={true}
                onClick={(e) => {
                  if (!active) {
                    e.preventDefault()
                    startTransition(() => router.push(href))
                  }
                }}
                className="flex min-w-[56px] flex-col items-center gap-[3px] py-2 transition-all active:scale-[0.88]"
                style={{ textDecoration: 'none' }}
              >
                <Icon size={24} color={active ? '#D97706' : 'rgba(235,235,245,0.45)'} />
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 400,
                    color: active ? '#D97706' : 'rgba(235,235,245,0.45)',
                  }}
                >
                  {label}
                </span>
              </Link>
            )
          })}
        </div>
      </nav>

      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        profile={profile}
        onSettingsOpen={() => setIsSettingsOpen(true)}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        profile={profile}
      />
    </div>
  )
}

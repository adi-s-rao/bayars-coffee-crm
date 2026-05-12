'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BarChart2, Calendar, Coffee, Home, LogOut, MapPin, Settings, X } from 'lucide-react'
import type { Profile } from '@/types'

const NAV_ITEMS = [
  { label: 'Home',     href: '/dashboard',          Icon: Home },
  { label: 'Map',      href: '/dashboard/map',      Icon: MapPin },
  { label: 'Calendar', href: '/dashboard/calendar', Icon: Calendar },
  { label: 'Reports',  href: '/dashboard/reports',  Icon: BarChart2 },
]

interface Props {
  isOpen: boolean
  onClose: () => void
  profile: Profile
  onSettingsOpen: () => void
}

async function signOut() {
  await fetch('/api/auth/signout', { method: 'POST' })
  window.location.href = '/login'
}

function getInitials(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map(n => n[0] ?? '')
    .join('')
    .toUpperCase()
}

export default function Sidebar({ isOpen, onClose, profile, onSettingsOpen }: Props) {
  const pathname = usePathname()
  const isManager = profile.role === 'manager'
  const roleBg    = isManager ? 'rgba(217,119,6,0.15)'   : 'rgba(10,132,255,0.15)'
  const roleColor = isManager ? '#D97706'                 : '#0A84FF'
  const roleLabel = isManager ? 'Manager'                 : 'Rep'

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      )}

      {/* Panel */}
      <div
        className={`fixed left-0 top-0 z-50 flex h-full flex-col transition-transform duration-[280ms] ease-[cubic-bezier(0.32,0.72,0,1)] ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{
          width: '300px',
          background: '#1C1C1E',
          borderRight: '0.5px solid rgba(84,84,88,0.65)',
        }}
      >
        {/* Header */}
        <div
          style={{
            borderBottom: '0.5px solid rgba(84,84,88,0.65)',
            padding: '24px 20px 20px',
          }}
        >
          <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Coffee size={18} style={{ color: '#D97706' }} />
              <span style={{ fontSize: '15px', fontWeight: 700, color: '#FFF' }}>Bayar&apos;s Coffee</span>
              <span style={{ fontSize: '12px', color: 'rgba(235,235,245,0.35)' }}>CRM</span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="transition-colors active:scale-[0.92]"
              style={{
                background: 'rgba(118,118,128,0.15)',
                border: 'none',
                borderRadius: '10px',
                padding: '7px',
                color: 'rgba(235,235,245,0.6)',
                cursor: 'pointer',
              }}
            >
              <X size={15} />
            </button>
          </div>

          {/* Avatar */}
          <div
            style={{
              marginBottom: '10px',
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              background: 'rgba(217,119,6,0.15)',
              border: '0.5px solid rgba(217,119,6,0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span style={{ fontSize: '15px', fontWeight: 600, color: '#D97706' }}>
              {getInitials(profile.full_name)}
            </span>
          </div>
          <p style={{ fontSize: '15px', fontWeight: 600, color: '#FFF' }}>{profile.full_name}</p>
          <div style={{ marginTop: '6px' }}>
            <span
              style={{
                borderRadius: '20px',
                padding: '3px 10px',
                fontSize: '11px',
                fontWeight: 600,
                background: roleBg,
                color: roleColor,
              }}
            >
              {roleLabel}
            </span>
          </div>
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, padding: '12px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {NAV_ITEMS.map(({ label, href, Icon }) => {
              const active = pathname === href
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={onClose}
                  className="flex items-center gap-3 rounded-xl transition-all active:scale-[0.97]"
                  style={{
                    height: '52px',
                    padding: '0 12px',
                    fontSize: '15px',
                    fontWeight: 500,
                    textDecoration: 'none',
                    background: active ? 'rgba(255,255,255,0.07)' : 'transparent',
                    color: active ? '#FFF' : 'rgba(235,235,245,0.5)',
                  }}
                >
                  <Icon size={22} color={active ? '#D97706' : undefined} />
                  {label}
                </Link>
              )
            })}
          </div>

          <div style={{ margin: '8px 0', borderTop: '0.5px solid rgba(84,84,88,0.65)' }} />

          <button
            type="button"
            onClick={() => { onSettingsOpen(); onClose() }}
            className="flex items-center gap-3 rounded-xl transition-all active:scale-[0.97] hover:bg-white/[0.04]"
            style={{
              width: '100%',
              height: '52px',
              padding: '0 12px',
              fontSize: '15px',
              fontWeight: 500,
              color: 'rgba(235,235,245,0.5)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            <Settings size={22} />
            Settings
          </button>
        </nav>

        {/* Sign out */}
        <div style={{ borderTop: '0.5px solid rgba(84,84,88,0.65)', padding: '12px' }}>
          <button
            type="button"
            onClick={signOut}
            className="flex items-center gap-3 rounded-xl transition-all active:scale-[0.97] hover:bg-red-500/10"
            style={{
              width: '100%',
              height: '52px',
              padding: '0 12px',
              fontSize: '15px',
              fontWeight: 500,
              color: '#FF453A',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            <LogOut size={22} />
            Sign Out
          </button>
        </div>
      </div>
    </>
  )
}

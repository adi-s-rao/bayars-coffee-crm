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
        className={`fixed left-0 top-0 z-50 flex h-full w-[280px] flex-col border-r border-white/[0.08] bg-[#111] transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-white/[0.08] p-6">
          <div>
            <div className="mb-4 flex items-center gap-2">
              <Coffee size={18} className="text-[#D97706]" />
              <span className="text-[15px] font-bold text-white">Bayar&apos;s Coffee</span>
              <span className="text-[12px] text-[#636366]">CRM</span>
            </div>
            <div className="mb-2.5 flex h-10 w-10 items-center justify-center rounded-full border border-amber-600/30 bg-amber-600/15">
              <span className="text-[13px] font-semibold text-[#D97706]">
                {getInitials(profile.full_name)}
              </span>
            </div>
            <p className="text-[15px] font-semibold text-white">{profile.full_name}</p>
            <div className="mt-1.5">
              <span
                className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
                style={{ backgroundColor: roleBg, color: roleColor }}
              >
                {roleLabel}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-white/[0.07] p-2 text-[#8E8E93] transition-colors hover:text-white"
          >
            <X size={15} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4">
          <div className="flex flex-col gap-1">
            {NAV_ITEMS.map(({ label, href, Icon }) => {
              const active = pathname === href
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={onClose}
                  className={`flex min-h-[44px] items-center gap-3 rounded-xl px-3 text-[15px] font-medium transition-all active:scale-[0.97] ${
                    active
                      ? 'bg-white/[0.07] text-white'
                      : 'text-[#8E8E93] hover:bg-white/[0.04] hover:text-white'
                  }`}
                >
                  <Icon size={18} color={active ? '#D97706' : undefined} />
                  {label}
                </Link>
              )
            })}
          </div>

          <div className="my-3 border-t border-white/[0.08]" />

          <button
            type="button"
            onClick={() => { onSettingsOpen(); onClose() }}
            className="flex min-h-[44px] w-full items-center gap-3 rounded-xl px-3 text-[15px] font-medium text-[#8E8E93] transition-all active:scale-[0.97] hover:bg-white/[0.04] hover:text-white"
          >
            <Settings size={18} />
            Settings
          </button>
        </nav>

        {/* Sign out */}
        <div className="border-t border-white/[0.08] p-4">
          <button
            type="button"
            onClick={signOut}
            className="flex min-h-[44px] w-full items-center gap-3 rounded-xl px-3 text-[15px] font-medium text-[#FF453A] transition-all active:scale-[0.97] hover:bg-red-500/10"
          >
            <LogOut size={18} />
            Sign Out
          </button>
        </div>
      </div>
    </>
  )
}

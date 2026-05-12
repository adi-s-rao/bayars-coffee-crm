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
  const roleBg    = isManager ? 'rgba(217,119,6,0.12)'   : 'rgba(59,130,246,0.12)'
  const roleColor = isManager ? '#D97706'                 : '#60A5FA'
  const roleLabel = isManager ? 'Manager'                 : 'Rep'

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div className="fixed inset-0 z-40 bg-black/60" onClick={onClose} />
      )}

      {/* Panel */}
      <div
        className={`fixed left-0 top-0 z-50 flex h-full w-[280px] flex-col border-r border-[#2A2A2A] bg-[#141414] transition-transform duration-200 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-[#1E1E1E] p-6">
          <div>
            <div className="mb-3 flex items-center gap-2">
              <Coffee size={18} className="text-[#D97706]" />
              <span className="text-[14px] font-bold text-white">Bayar&apos;s Coffee</span>
              <span className="text-[12px] text-[#555]">CRM</span>
            </div>
            <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-full border border-amber-600/30 bg-amber-600/15">
              <span className="text-[13px] font-semibold text-[#D97706]">
                {getInitials(profile.full_name)}
              </span>
            </div>
            <p className="text-[14px] font-medium text-white">{profile.full_name}</p>
            <div className="mt-1">
              <span
                className="rounded-full px-2.5 py-0.5 text-[11px] font-medium"
                style={{ backgroundColor: roleBg, color: roleColor }}
              >
                {roleLabel}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-[#2A2A2A] p-1.5 text-[#7A7A7A] hover:text-white transition-colors"
          >
            <X size={14} />
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
                  className={`flex items-center gap-3 rounded-xl p-3 text-[14px] font-medium transition-colors ${
                    active
                      ? 'bg-[#1A1A1A] text-white'
                      : 'text-[#7A7A7A] hover:bg-[#1A1A1A]/50 hover:text-white'
                  }`}
                >
                  <Icon size={18} color={active ? '#D97706' : undefined} />
                  {label}
                </Link>
              )
            })}
          </div>

          <div className="my-3 border-t border-[#1E1E1E]" />

          <button
            type="button"
            onClick={() => { onSettingsOpen(); onClose() }}
            className="flex w-full items-center gap-3 rounded-xl p-3 text-[14px] font-medium text-[#7A7A7A] hover:bg-[#1A1A1A]/50 hover:text-white transition-colors"
          >
            <Settings size={18} />
            Settings
          </button>
        </nav>

        {/* Sign out */}
        <div className="border-t border-[#1E1E1E] p-4">
          <button
            type="button"
            onClick={signOut}
            className="flex w-full items-center gap-3 rounded-xl p-3 text-[14px] font-medium text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <LogOut size={18} />
            Sign Out
          </button>
        </div>
      </div>
    </>
  )
}

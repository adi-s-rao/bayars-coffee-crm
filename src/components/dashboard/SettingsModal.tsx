'use client'

import { useEffect, useState } from 'react'
import { MapPin, X } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types'

interface Props {
  isOpen: boolean
  onClose: () => void
  profile: Profile
}

const inputClass =
  'w-full rounded-xl bg-white/[0.07] px-3.5 py-3 text-[15px] text-white outline-none placeholder:text-[#636366] focus:bg-white/[0.10] transition-colors'

export default function SettingsModal({ isOpen, onClose, profile }: Props) {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordUpdating, setPasswordUpdating] = useState(false)
  const [passwordError, setPasswordError] = useState('')
  const [passwordSuccess, setPasswordSuccess] = useState(false)

  const [darkMode, setDarkMode] = useState(true)

  type LocStatus = 'granted' | 'denied' | 'prompt' | 'checking'
  const [locationStatus, setLocationStatus] = useState<LocStatus>('checking')

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    if (isOpen) document.addEventListener('keydown', handleEsc)
    return () => document.removeEventListener('keydown', handleEsc)
  }, [isOpen, onClose])

  useEffect(() => {
    if (!isOpen) return
    const stored = localStorage.getItem('bayars-theme')
    setDarkMode(stored !== 'light')
    navigator.permissions
      .query({ name: 'geolocation' as PermissionName })
      .then(r => setLocationStatus(r.state as LocStatus))
      .catch(() => setLocationStatus('prompt'))
  }, [isOpen])

  if (!isOpen) return null

  async function handlePasswordUpdate() {
    if (!newPassword || !confirmPassword) {
      setPasswordError('Please fill in all password fields')
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match')
      return
    }
    if (newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters')
      return
    }
    setPasswordUpdating(true)
    setPasswordError('')
    setPasswordSuccess(false)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) {
        setPasswordError(error.message)
      } else {
        setPasswordSuccess(true)
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
      }
    } catch {
      setPasswordError('Failed to update password')
    } finally {
      setPasswordUpdating(false)
    }
  }

  function handleDarkModeToggle() {
    if (darkMode) {
      toast.info('Light mode coming soon')
    } else {
      setDarkMode(true)
      localStorage.setItem('bayars-theme', 'dark')
    }
  }

  function requestLocation() {
    navigator.geolocation.getCurrentPosition(
      () => {
        setLocationStatus('granted')
        toast.success('Location access granted')
      },
      () => {
        toast.error('Please enable location in your browser settings')
      }
    )
  }

  const locBadge = (
    status: LocStatus
  ): { label: string; bg: string; color: string } => {
    if (status === 'granted') return { label: 'Granted', bg: 'rgba(48,209,88,0.15)', color: '#30D158' }
    if (status === 'denied')  return { label: 'Denied',  bg: 'rgba(255,69,58,0.15)', color: '#FF453A' }
    return { label: 'Unknown', bg: 'rgba(142,142,147,0.15)', color: '#8E8E93' }
  }
  const badge = locBadge(locationStatus)

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 max-h-[90vh] w-full max-w-md overflow-y-auto rounded-3xl bg-[#1C1C1E] p-6">

        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-[20px] font-semibold text-white">Settings</h2>
            <p className="mt-0.5 text-[13px] text-[#8E8E93]">{profile.full_name}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-white/[0.07] p-2 text-[#8E8E93] transition-colors hover:text-white"
          >
            <X size={16} />
          </button>
        </div>

        {/* Account */}
        <div className="mb-6">
          <p className="mb-3 text-[12px] font-semibold uppercase tracking-wider text-[#636366]">Account</p>
          <div className="flex flex-col gap-3">
            <input
              type="password"
              placeholder="Current password"
              value={currentPassword}
              onChange={e => setCurrentPassword(e.target.value)}
              className={inputClass}
            />
            <input
              type="password"
              placeholder="New password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              className={inputClass}
            />
            <input
              type="password"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              className={inputClass}
            />
            {passwordError && (
              <p className="text-[13px] text-[#FF453A]">{passwordError}</p>
            )}
            {passwordSuccess && (
              <p className="text-[13px] text-[#30D158]">Password updated successfully</p>
            )}
            <button
              type="button"
              onClick={handlePasswordUpdate}
              disabled={passwordUpdating}
              className="w-full rounded-2xl bg-[#D97706] py-[14px] text-[17px] font-semibold text-white transition-all active:scale-[0.98] hover:bg-[#B45309] disabled:opacity-50"
            >
              {passwordUpdating ? 'Updating…' : 'Update Password'}
            </button>
          </div>
        </div>

        {/* Appearance */}
        <div className="mb-6">
          <p className="mb-3 text-[12px] font-semibold uppercase tracking-wider text-[#636366]">Appearance</p>
          <div className="flex items-center justify-between rounded-2xl bg-white/[0.05] px-4 py-3.5">
            <span className="text-[15px] text-white">Dark Mode</span>
            <button
              type="button"
              onClick={handleDarkModeToggle}
              className={`relative h-[28px] w-[50px] rounded-full transition-colors ${darkMode ? 'bg-[#D97706]' : 'bg-[#3A3A3C]'}`}
            >
              <span
                className={`absolute top-[3px] h-[22px] w-[22px] rounded-full bg-white shadow-sm transition-transform ${
                  darkMode ? 'left-[25px]' : 'left-[3px]'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Permissions */}
        <div>
          <p className="mb-3 text-[12px] font-semibold uppercase tracking-wider text-[#636366]">Permissions</p>
          <div className="flex items-center justify-between rounded-2xl bg-white/[0.05] px-4 py-3.5">
            <div className="flex items-center gap-2.5">
              <MapPin size={15} className="text-[#8E8E93]" />
              <span className="text-[15px] text-white">Location Access</span>
            </div>
            <div className="flex items-center gap-2">
              <span
                className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
                style={{ backgroundColor: badge.bg, color: badge.color }}
              >
                {badge.label}
              </span>
              {locationStatus !== 'granted' && (
                <button
                  type="button"
                  onClick={requestLocation}
                  className="rounded-lg bg-white/[0.07] px-2.5 py-1 text-[12px] text-[#8E8E93] transition-colors hover:text-white"
                >
                  Request
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

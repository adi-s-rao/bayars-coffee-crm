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
  'w-full rounded-lg border border-[#2A2A2A] bg-[#111] px-3 py-2.5 text-sm text-white outline-none focus:border-[#D97706] focus:ring-1 focus:ring-amber-600/20 transition-colors placeholder:text-[#555]'

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
    if (status === 'granted') return { label: 'Granted', bg: 'rgba(34,197,94,0.15)', color: '#22C55E' }
    if (status === 'denied')  return { label: 'Denied',  bg: 'rgba(239,68,68,0.15)', color: '#EF4444' }
    return { label: 'Unknown', bg: 'rgba(85,85,85,0.2)', color: '#777' }
  }
  const badge = locBadge(locationStatus)

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative z-10 max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-[#2A2A2A] bg-[#1A1A1A] p-6">

        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-[16px] font-semibold text-white">Settings</h2>
            <p className="mt-0.5 text-[12px] text-[#555]">{profile.full_name}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-[#2A2A2A] p-1.5 text-[#7A7A7A] hover:text-white transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Account */}
        <div className="mb-6">
          <p className="mb-3 text-[11px] font-semibold tracking-wider text-[#555]">ACCOUNT</p>
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
              <p className="text-[12px] text-red-400">{passwordError}</p>
            )}
            {passwordSuccess && (
              <p className="text-[12px] text-green-400">Password updated successfully</p>
            )}
            <button
              type="button"
              onClick={handlePasswordUpdate}
              disabled={passwordUpdating}
              className="w-full rounded-lg bg-[#D97706] py-2.5 text-sm font-semibold text-white hover:bg-[#B45309] disabled:opacity-50 transition-colors"
            >
              {passwordUpdating ? 'Updating…' : 'Update Password'}
            </button>
          </div>
        </div>

        {/* Appearance */}
        <div className="mb-6">
          <p className="mb-3 text-[11px] font-semibold tracking-wider text-[#555]">APPEARANCE</p>
          <div className="flex items-center justify-between rounded-lg border border-[#2A2A2A] bg-[#111] px-3 py-3">
            <span className="text-[13px] text-white">Dark Mode</span>
            <button
              type="button"
              onClick={handleDarkModeToggle}
              className={`relative h-5 w-10 rounded-full transition-colors ${darkMode ? 'bg-[#D97706]' : 'bg-[#333]'}`}
            >
              <span
                className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                  darkMode ? 'left-5' : 'left-0.5'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Permissions */}
        <div>
          <p className="mb-3 text-[11px] font-semibold tracking-wider text-[#555]">PERMISSIONS</p>
          <div className="flex items-center justify-between rounded-lg border border-[#2A2A2A] bg-[#111] px-3 py-3">
            <div className="flex items-center gap-2">
              <MapPin size={14} className="text-[#555]" />
              <span className="text-[13px] text-white">Location Access</span>
            </div>
            <div className="flex items-center gap-2">
              <span
                className="rounded-full px-2 py-0.5 text-[11px] font-medium"
                style={{ backgroundColor: badge.bg, color: badge.color }}
              >
                {badge.label}
              </span>
              {locationStatus !== 'granted' && (
                <button
                  type="button"
                  onClick={requestLocation}
                  className="rounded-md border border-[#2A2A2A] px-2 py-0.5 text-[11px] text-[#A0A0A0] hover:text-white transition-colors"
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

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

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'rgba(118,118,128,0.12)',
  borderRadius: '10px',
  border: 'none',
  padding: '12px 14px',
  fontSize: '15px',
  color: '#FFF',
  outline: 'none',
  boxSizing: 'border-box',
}

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

  const locBadge = (status: LocStatus): { label: string; bg: string; color: string } => {
    if (status === 'granted') return { label: 'Granted', bg: 'rgba(48,209,88,0.15)', color: '#30D158' }
    if (status === 'denied')  return { label: 'Denied',  bg: 'rgba(255,69,58,0.15)', color: '#FF453A' }
    return { label: 'Unknown', bg: 'rgba(118,118,128,0.2)', color: 'rgba(235,235,245,0.6)' }
  }
  const badge = locBadge(locationStatus)

  const sectionLabel: React.CSSProperties = {
    marginBottom: '12px',
    fontSize: '13px',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: 'rgba(235,235,245,0.4)',
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative z-10 w-full max-w-md overflow-y-auto"
        style={{
          background: '#1C1C1E',
          borderRadius: '24px',
          padding: '24px',
          maxHeight: '90vh',
          border: '0.5px solid rgba(84,84,88,0.65)',
        }}
      >
        {/* Header */}
        <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: 600, color: '#FFF' }}>Settings</h2>
            <p style={{ marginTop: '2px', fontSize: '13px', color: 'rgba(235,235,245,0.4)' }}>{profile.full_name}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="transition-colors active:scale-[0.92]"
            style={{
              background: 'rgba(118,118,128,0.15)',
              border: 'none',
              borderRadius: '10px',
              padding: '8px',
              color: 'rgba(235,235,245,0.6)',
              cursor: 'pointer',
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Account */}
        <div style={{ marginBottom: '24px' }}>
          <p style={sectionLabel}>Account</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <input
              type="password"
              placeholder="Current password"
              value={currentPassword}
              onChange={e => setCurrentPassword(e.target.value)}
              style={inputStyle}
              className="placeholder:text-[rgba(235,235,245,0.3)]"
            />
            <input
              type="password"
              placeholder="New password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              style={inputStyle}
              className="placeholder:text-[rgba(235,235,245,0.3)]"
            />
            <input
              type="password"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              style={inputStyle}
              className="placeholder:text-[rgba(235,235,245,0.3)]"
            />
            {passwordError && (
              <p style={{ fontSize: '13px', color: '#FF453A' }}>{passwordError}</p>
            )}
            {passwordSuccess && (
              <p style={{ fontSize: '13px', color: '#30D158' }}>Password updated successfully</p>
            )}
            <button
              type="button"
              onClick={handlePasswordUpdate}
              disabled={passwordUpdating}
              className="flex items-center justify-center transition-all active:scale-[0.98]"
              style={{
                width: '100%',
                height: '50px',
                borderRadius: '14px',
                background: '#D97706',
                color: '#FFF',
                fontSize: '17px',
                fontWeight: 600,
                border: 'none',
                cursor: passwordUpdating ? 'not-allowed' : 'pointer',
                opacity: passwordUpdating ? 0.5 : 1,
              }}
            >
              {passwordUpdating ? 'Updating…' : 'Update Password'}
            </button>
          </div>
        </div>

        {/* Appearance */}
        <div style={{ marginBottom: '24px' }}>
          <p style={sectionLabel}>Appearance</p>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'rgba(118,118,128,0.08)',
              borderRadius: '12px',
              padding: '14px 16px',
            }}
          >
            <span style={{ fontSize: '15px', color: '#FFF' }}>Dark Mode</span>
            <button
              type="button"
              onClick={handleDarkModeToggle}
              style={{
                position: 'relative',
                width: '50px',
                height: '28px',
                borderRadius: '14px',
                border: 'none',
                cursor: 'pointer',
                background: darkMode ? '#D97706' : 'rgba(118,118,128,0.4)',
                transition: 'background 0.2s ease',
              }}
            >
              <span
                style={{
                  position: 'absolute',
                  top: '3px',
                  left: darkMode ? '25px' : '3px',
                  width: '22px',
                  height: '22px',
                  borderRadius: '50%',
                  background: '#FFF',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                  transition: 'left 0.2s ease',
                }}
              />
            </button>
          </div>
        </div>

        {/* Permissions */}
        <div>
          <p style={sectionLabel}>Permissions</p>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'rgba(118,118,128,0.08)',
              borderRadius: '12px',
              padding: '14px 16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <MapPin size={15} style={{ color: 'rgba(235,235,245,0.6)' }} />
              <span style={{ fontSize: '15px', color: '#FFF' }}>Location Access</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span
                style={{
                  borderRadius: '20px',
                  padding: '3px 10px',
                  fontSize: '11px',
                  fontWeight: 600,
                  background: badge.bg,
                  color: badge.color,
                }}
              >
                {badge.label}
              </span>
              {locationStatus !== 'granted' && (
                <button
                  type="button"
                  onClick={requestLocation}
                  className="transition-colors hover:text-white"
                  style={{
                    background: 'rgba(118,118,128,0.2)',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '6px 12px',
                    fontSize: '12px',
                    color: 'rgba(235,235,245,0.6)',
                    cursor: 'pointer',
                  }}
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

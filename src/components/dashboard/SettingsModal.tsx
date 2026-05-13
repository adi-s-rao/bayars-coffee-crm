'use client'

import { createPortal } from 'react-dom'
import { useEffect, useState } from 'react'
import { MapPin, X } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { useTheme } from '@/contexts/ThemeContext'
import type { Profile } from '@/types'

interface Props {
  isOpen: boolean
  onClose: () => void
  profile: Profile
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'var(--bg-input)',
  borderRadius: '10px',
  border: 'none',
  padding: '12px 14px',
  fontSize: '15px',
  color: 'var(--label-primary)',
  outline: 'none',
  boxSizing: 'border-box',
  fontFamily: 'inherit',
}

function SettingsContent({ onClose, profile }: { onClose: () => void; profile: Profile }) {
  const { theme, toggleTheme } = useTheme()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword]         = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordUpdating, setPasswordUpdating] = useState(false)
  const [passwordError, setPasswordError]     = useState('')
  const [passwordSuccess, setPasswordSuccess] = useState(false)

  type LocStatus = 'granted' | 'denied' | 'prompt' | 'checking'
  const [locationStatus, setLocationStatus] = useState<LocStatus>('checking')

  useEffect(() => {
    navigator.permissions
      .query({ name: 'geolocation' as PermissionName })
      .then(r => setLocationStatus(r.state as LocStatus))
      .catch(() => setLocationStatus('prompt'))
  }, [])

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleEsc)
    return () => document.removeEventListener('keydown', handleEsc)
  }, [onClose])

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
        toast.success('Password updated!')
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

  const locBadge = (status: LocStatus) => {
    if (status === 'granted') return { label: 'Granted', bg: 'rgba(48,209,88,0.15)',  color: '#30D158' }
    if (status === 'denied')  return { label: 'Denied',  bg: 'rgba(255,69,58,0.15)',  color: '#FF453A' }
    return { label: 'Unknown', bg: 'var(--bg-input)', color: 'var(--label-secondary)' }
  }
  const badge = locBadge(locationStatus)

  const sectionLabel: React.CSSProperties = {
    marginBottom: '12px',
    fontSize: '13px',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: 'var(--label-tertiary)',
  }

  const lightMode = theme === 'light'

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 16px' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }} onClick={onClose} />
      <div
        style={{
          position: 'relative',
          zIndex: 10,
          width: '100%',
          maxWidth: '448px',
          overflowY: 'auto',
          background: 'var(--bg-card)',
          borderRadius: '24px',
          padding: '24px',
          maxHeight: '90vh',
          border: '0.5px solid var(--separator)',
        }}
      >
        {/* Header */}
        <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--label-primary)' }}>Settings</h2>
            <p style={{ marginTop: '2px', fontSize: '13px', color: 'var(--label-tertiary)' }}>{profile.full_name}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'var(--bg-input)',
              border: 'none',
              borderRadius: '10px',
              padding: '8px',
              color: 'var(--label-secondary)',
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
              onClick={() => void handlePasswordUpdate()}
              disabled={passwordUpdating}
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
                fontFamily: 'inherit',
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
              background: 'var(--bg-input)',
              borderRadius: '12px',
              padding: '14px 16px',
            }}
          >
            <span style={{ fontSize: '15px', color: 'var(--label-primary)' }}>Light Mode</span>
            <button
              type="button"
              onClick={toggleTheme}
              style={{
                position: 'relative',
                width: '50px',
                height: '28px',
                borderRadius: '14px',
                border: 'none',
                cursor: 'pointer',
                background: lightMode ? '#D97706' : 'rgba(118,118,128,0.4)',
                transition: 'background 0.2s ease',
              }}
            >
              <span
                style={{
                  position: 'absolute',
                  top: '3px',
                  left: lightMode ? '25px' : '3px',
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
              background: 'var(--bg-input)',
              borderRadius: '12px',
              padding: '14px 16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <MapPin size={15} style={{ color: 'var(--label-secondary)' }} />
              <span style={{ fontSize: '15px', color: 'var(--label-primary)' }}>Location Access</span>
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
                  style={{
                    background: 'var(--bg-input)',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '6px 12px',
                    fontSize: '12px',
                    color: 'var(--label-secondary)',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
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

export default function SettingsModal({ isOpen, onClose, profile }: Props) {
  if (!isOpen) return null
  if (typeof document === 'undefined') return null
  return createPortal(
    <SettingsContent onClose={onClose} profile={profile} />,
    document.body
  )
}

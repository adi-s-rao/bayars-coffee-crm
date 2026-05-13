'use client'

import { useEffect, useState } from 'react'
import { Loader2, MapPin, X } from 'lucide-react'
import { toast } from 'sonner'
import type { Lead, LeadStatus, Profile } from '@/types'

interface Props {
  isOpen: boolean
  onClose: () => void
  profile: Profile
  onCreated: (lead: Lead) => void
}

const STATUSES: { value: LeadStatus; label: string }[] = [
  { value: 'cold_lead',      label: 'Cold Lead' },
  { value: 'hot_lead',       label: 'Hot Lead' },
  { value: 'demo_scheduled', label: 'Demo Scheduled' },
  { value: 'customer',       label: 'Customer' },
  { value: 'competitor',     label: 'Competitor' },
]

const POC_REGEX = /^\+?[0-9]{10,15}$/

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

const labelStyle: React.CSSProperties = {
  display: 'block',
  marginBottom: '6px',
  fontSize: '13px',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  color: 'var(--label-tertiary)',
}

export default function NewLeadModal({ isOpen, onClose, onCreated }: Props) {
  const [cafeName, setCafeName] = useState('')
  const [status, setStatus] = useState<LeadStatus>('cold_lead')
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [address, setAddress] = useState('')
  const [gpsLoading, setGpsLoading] = useState(false)
  const [pocName, setPocName] = useState('')
  const [pocContact, setPocContact] = useState('')
  const [pocError, setPocError] = useState('')
  const [remarks, setRemarks] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    if (isOpen) document.addEventListener('keydown', handleEsc)
    return () => document.removeEventListener('keydown', handleEsc)
  }, [isOpen, onClose])

  if (!isOpen) return null

  async function captureLocation() {
    setGpsLoading(true)
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
        })
      )
      const lat = pos.coords.latitude
      const lng = pos.coords.longitude
      setLocation({ lat, lng })

      try {
        const res = await fetch(`/api/geocode?lat=${lat}&lon=${lng}`)
        if (res.ok) {
          const { address: addr } = await res.json() as { address: string }
          setAddress(addr)
        }
      } catch {
        // silently fall back to manual entry
      }
    } catch {
      toast.error('Could not get your location. Please enable GPS.')
    } finally {
      setGpsLoading(false)
    }
  }

  function validateContact(value: string): boolean {
    const stripped = value.replace(/[\s\-]/g, '')
    return stripped === '' || POC_REGEX.test(stripped)
  }

  function handleContactBlur() {
    if (pocContact && !validateContact(pocContact)) {
      setPocError('Enter a valid phone number (10–15 digits)')
    } else {
      setPocError('')
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!cafeName.trim() || !location) return
    if (pocContact && !validateContact(pocContact)) return

    setSubmitting(true)
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cafe_name: cafeName.trim(),
          status,
          latitude: location.lat,
          longitude: location.lng,
          location_address: address || undefined,
          poc_name: pocName || undefined,
          poc_contact: pocContact || undefined,
          remarks: remarks || undefined,
        }),
      })
      if (!res.ok) throw new Error('Failed')
      const { lead } = await res.json() as { lead: Lead }
      window.dispatchEvent(new Event('lead-created'))
      onCreated(lead)
      setCafeName(''); setStatus('cold_lead'); setLocation(null); setAddress('')
      setPocName(''); setPocContact(''); setRemarks('')
    } catch {
      toast.error('Failed to create lead. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const canSubmit = cafeName.trim().length > 0 && location !== null && !pocError

  return (
    <div className="fixed inset-0 flex items-end justify-center md:items-center" style={{ zIndex: 1100 }}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div
        className="relative z-10 w-full overflow-y-auto md:mx-4 md:max-w-md md:rounded-3xl"
        style={{ background: 'var(--bg-card)', borderRadius: '24px 24px 0 0', padding: '24px', paddingBottom: 90, maxHeight: '92vh' }}
      >
        {/* Drag handle */}
        <div style={{ width: '36px', height: '4px', borderRadius: '2px', background: 'rgba(235,235,245,0.2)', margin: '0 auto 20px' }} className="md:hidden" />

        {/* Header */}
        <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--label-primary)' }}>New Lead</h2>
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

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Cafe Name */}
          <div>
            <label style={labelStyle}>Cafe Name *</label>
            <input
              type="text"
              placeholder="Blue Tokai, Third Wave…"
              value={cafeName}
              onChange={e => setCafeName(e.target.value)}
              required
              style={inputStyle}
              className="placeholder:text-[rgba(235,235,245,0.3)]"
            />
          </div>

          {/* Status */}
          <div>
            <label style={labelStyle}>Status *</label>
            <select
              value={status}
              onChange={e => setStatus(e.target.value as LeadStatus)}
              style={{ ...inputStyle, cursor: 'pointer' }}
            >
              {STATUSES.map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>

          {/* GPS + Address */}
          <div>
            <label style={labelStyle}>Location *</label>
            {location ? (
              <div
                style={{
                  marginBottom: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'rgba(48,209,88,0.1)',
                  borderRadius: '10px',
                  padding: '14px',
                }}
              >
                <MapPin size={13} style={{ color: '#30D158' }} />
                <span style={{ fontSize: '13px', color: '#30D158' }}>GPS captured</span>
              </div>
            ) : (
              <button
                type="button"
                onClick={captureLocation}
                disabled={gpsLoading}
                className="flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                style={{
                  width: '100%',
                  height: '50px',
                  marginBottom: '12px',
                  background: 'rgba(118,118,128,0.15)',
                  border: '0.5px solid rgba(255,255,255,0.1)',
                  borderRadius: '10px',
                  fontSize: '15px',
                  color: 'rgba(235,235,245,0.6)',
                  cursor: 'pointer',
                  opacity: gpsLoading ? 0.5 : 1,
                }}
              >
                {gpsLoading ? <Loader2 size={14} className="animate-spin" /> : <MapPin size={14} />}
                {gpsLoading ? 'Getting location…' : 'Capture Location'}
              </button>
            )}
            {location && (
              <input
                type="text"
                placeholder="Address (auto-filled, edit if needed)"
                value={address}
                onChange={e => setAddress(e.target.value)}
                style={inputStyle}
                className="placeholder:text-[rgba(235,235,245,0.3)]"
              />
            )}
          </div>

          {/* POC Name */}
          <div>
            <label style={labelStyle}>POC Name</label>
            <input
              type="text"
              placeholder="Contact person's name"
              value={pocName}
              onChange={e => setPocName(e.target.value)}
              style={inputStyle}
              className="placeholder:text-[rgba(235,235,245,0.3)]"
            />
          </div>

          {/* POC Contact */}
          <div>
            <label style={labelStyle}>POC Contact</label>
            <input
              type="tel"
              placeholder="+91 XXXXX XXXXX"
              value={pocContact}
              onChange={e => { setPocContact(e.target.value); setPocError('') }}
              onBlur={handleContactBlur}
              style={{
                ...inputStyle,
                ...(pocError ? { boxShadow: '0 0 0 1px #FF453A' } : {}),
              }}
              className="placeholder:text-[rgba(235,235,245,0.3)]"
            />
            {pocError && <p style={{ marginTop: '6px', fontSize: '12px', color: '#FF453A' }}>{pocError}</p>}
          </div>

          {/* Remarks */}
          <div>
            <label style={labelStyle}>Remarks</label>
            <textarea
              rows={2}
              placeholder="Any notes…"
              value={remarks}
              onChange={e => setRemarks(e.target.value)}
              style={{ ...inputStyle, resize: 'none' }}
              className="placeholder:text-[rgba(235,235,245,0.3)]"
            />
          </div>

          <button
            type="submit"
            disabled={!canSubmit || submitting}
            className="flex items-center justify-center gap-2 transition-all active:scale-[0.97]"
            style={{
              width: '100%',
              height: '54px',
              borderRadius: '14px',
              background: '#D97706',
              color: '#FFF',
              fontSize: '17px',
              fontWeight: 600,
              border: 'none',
              cursor: !canSubmit || submitting ? 'not-allowed' : 'pointer',
              opacity: !canSubmit || submitting ? 0.5 : 1,
            }}
          >
            {submitting && <Loader2 size={18} className="animate-spin" />}
            {submitting ? 'Adding…' : 'Add Lead'}
          </button>
        </form>
      </div>
    </div>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle, Loader2, MapPin, X } from 'lucide-react'
import { toast } from 'sonner'
import type { CheckInType, Lead, LeadStatus, Profile } from '@/types'

interface Props {
  lead: Lead
  isOpen: boolean
  onClose: () => void
  onCheckedIn?: (updatedLead: Lead) => void
  profile: Profile
}

const STATUS_META: Record<LeadStatus, { label: string; color: string; bg: string }> = {
  cold_lead:      { label: 'Cold Lead',  color: '#0A84FF', bg: 'rgba(10,132,255,0.15)' },
  hot_lead:       { label: 'Hot Lead',   color: '#FF9F0A', bg: 'rgba(255,159,10,0.15)' },
  demo_scheduled: { label: 'Demo',       color: '#D97706', bg: 'rgba(217,119,6,0.15)'  },
  customer:       { label: 'Customer',   color: '#30D158', bg: 'rgba(48,209,88,0.15)'  },
  competitor:     { label: 'Competitor', color: '#FF453A', bg: 'rgba(255,69,58,0.15)'  },
}

const CHECKIN_TYPES: CheckInType[] = ['visit', 'demo', 'workshop']

function haversineMetres(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const R = 6371000
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2
  return R * 2 * Math.asin(Math.sqrt(a))
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

export default function CheckInModal({ lead, isOpen, onClose, onCheckedIn, profile }: Props) {
  const [checkinType, setCheckinType] = useState<CheckInType>('visit')
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [gpsLoading, setGpsLoading] = useState(false)
  const [gpsNote, setGpsNote] = useState<string | null>(null)
  const [geofenceWarning, setGeofenceWarning] = useState<{ distance: number } | null>(null)
  const [remarks, setRemarks] = useState('')
  const [gatePass, setGatePass] = useState('')
  const [beansUsed, setBeansUsed] = useState(false)
  const [beanBrand, setBeanBrand] = useState('')
  const [beanAmount, setBeanAmount] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    if (isOpen) document.addEventListener('keydown', handleEsc)
    return () => document.removeEventListener('keydown', handleEsc)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const statusMeta = STATUS_META[lead.status]

  async function captureLocation() {
    setGpsLoading(true)
    setGeofenceWarning(null)
    setGpsNote(null)
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
        })
      )
      const capturedLat = pos.coords.latitude
      const capturedLng = pos.coords.longitude

      if (lead.latitude != null && lead.longitude != null) {
        const dist = haversineMetres(capturedLat, capturedLng, lead.latitude, lead.longitude)
        if (dist > 100) {
          setGeofenceWarning({ distance: Math.round(dist) })
        }
      } else {
        setGpsNote('Lead has no GPS — location not verified')
      }

      setLocation({ lat: capturedLat, lng: capturedLng })
    } catch {
      toast.error('Could not get your location. Please enable GPS.')
    } finally {
      setGpsLoading(false)
    }
  }

  function cancelGps() {
    setLocation(null)
    setGeofenceWarning(null)
    setGpsNote(null)
  }

  async function handleSubmit(flagged = false) {
    if (!location) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/checkins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: checkinType,
          latitude: location.lat,
          longitude: location.lng,
          lead_id: lead.id,
          user_id: profile.id,
          user_name: profile.full_name,
          remarks: remarks || undefined,
          gate_pass_number: gatePass || undefined,
          beans_used: beansUsed,
          bean_brand: beansUsed ? beanBrand || undefined : undefined,
          bean_amount_kg: beansUsed && beanAmount ? parseFloat(beanAmount) : undefined,
          geofence_flagged: flagged,
          geofence_distance_m: flagged && geofenceWarning ? geofenceWarning.distance : undefined,
        }),
      })
      if (!res.ok) throw new Error('Failed')
      const json = await res.json() as { success: boolean; lead: Lead | null }
      toast.success('Check-in recorded!')
      window.dispatchEvent(new Event('checkin-completed'))
      if (json.lead) onCheckedIn?.(json.lead)
      onClose()
    } catch {
      toast.error('Failed to submit check-in. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div
        className="relative z-10 w-full md:mx-4 md:max-w-md md:rounded-3xl"
        style={{ background: '#1C1C1E', borderRadius: '24px 24px 0 0', padding: '24px' }}
      >
        {/* Drag handle */}
        <div style={{ width: '36px', height: '4px', borderRadius: '2px', background: 'rgba(235,235,245,0.2)', margin: '0 auto 20px' }} className="md:hidden" />

        {/* Header */}
        <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: 600, color: '#FFF' }}>Check In</h2>
            <div style={{ marginTop: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <p style={{ fontSize: '15px', color: 'rgba(235,235,245,0.6)' }}>{lead.cafe_name}</p>
              <span
                style={{
                  borderRadius: '6px',
                  padding: '2px 8px',
                  fontSize: '11px',
                  fontWeight: 600,
                  background: statusMeta.bg,
                  color: statusMeta.color,
                }}
              >
                {statusMeta.label}
              </span>
            </div>
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

        {/* Type selector */}
        <div style={{ marginBottom: '20px', display: 'flex', gap: '8px' }}>
          {CHECKIN_TYPES.map(t => (
            <button
              key={t}
              type="button"
              onClick={() => setCheckinType(t)}
              className="flex-1 transition-all active:scale-[0.95]"
              style={{
                height: '44px',
                borderRadius: '10px',
                fontSize: '15px',
                fontWeight: 500,
                textTransform: 'capitalize',
                border: 'none',
                cursor: 'pointer',
                background: checkinType === t ? '#D97706' : 'rgba(118,118,128,0.2)',
                color: checkinType === t ? '#FFF' : 'rgba(235,235,245,0.6)',
              }}
            >
              {t}
            </button>
          ))}
        </div>

        {/* GPS */}
        <div style={{ marginBottom: '16px' }}>
          {location ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: 'rgba(48,209,88,0.1)',
                borderRadius: '10px',
                padding: '14px',
              }}
            >
              <MapPin size={14} style={{ color: '#30D158' }} />
              <span style={{ flex: 1, fontSize: '13px', color: '#30D158' }}>Location captured</span>
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

          {gpsNote && (
            <p style={{ marginTop: '6px', fontSize: '12px', color: 'rgba(235,235,245,0.4)' }}>{gpsNote}</p>
          )}

          {geofenceWarning && (
            <div style={{ marginTop: '8px', background: 'rgba(255,69,58,0.1)', borderRadius: '10px', padding: '14px' }}>
              <div className="flex items-center gap-2">
                <AlertTriangle size={14} style={{ flexShrink: 0, color: '#FF453A' }} />
                <span style={{ fontSize: '13px', color: '#FF453A' }}>
                  You are {geofenceWarning.distance}m away from this location
                </span>
              </div>
              <p style={{ marginTop: '4px', fontSize: '12px', color: 'rgba(235,235,245,0.4)' }}>
                Check-in recorded but flagged for review
              </p>
              <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={cancelGps}
                  style={{
                    flex: 1,
                    height: '40px',
                    background: 'rgba(118,118,128,0.2)',
                    borderRadius: '8px',
                    border: 'none',
                    fontSize: '13px',
                    color: 'rgba(235,235,245,0.6)',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void handleSubmit(true)}
                  disabled={submitting}
                  style={{
                    flex: 1,
                    height: '40px',
                    background: 'rgba(255,69,58,0.2)',
                    borderRadius: '8px',
                    border: 'none',
                    fontSize: '13px',
                    color: '#FF453A',
                    cursor: 'pointer',
                    opacity: submitting ? 0.5 : 1,
                  }}
                >
                  {submitting ? 'Submitting…' : 'Check In Anyway'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Remarks */}
        <div style={{ marginBottom: '12px' }}>
          <textarea
            rows={2}
            placeholder="Add notes…"
            value={remarks}
            onChange={e => setRemarks(e.target.value)}
            style={{ ...inputStyle, resize: 'none' }}
            className="placeholder:text-[rgba(235,235,245,0.3)]"
          />
        </div>

        {/* Gate pass */}
        <div style={{ marginBottom: '16px' }}>
          <input
            type="text"
            placeholder="Gate pass number (optional)"
            value={gatePass}
            onChange={e => setGatePass(e.target.value)}
            style={inputStyle}
            className="placeholder:text-[rgba(235,235,245,0.3)]"
          />
        </div>

        {/* Beans toggle */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ marginBottom: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '15px', color: 'rgba(235,235,245,0.6)' }}>Beans used?</span>
            <button
              type="button"
              onClick={() => setBeansUsed(v => !v)}
              style={{
                position: 'relative',
                width: '50px',
                height: '28px',
                borderRadius: '14px',
                border: 'none',
                cursor: 'pointer',
                background: beansUsed ? '#D97706' : 'rgba(118,118,128,0.4)',
                transition: 'background 0.2s ease',
              }}
            >
              <span
                style={{
                  position: 'absolute',
                  top: '3px',
                  left: beansUsed ? '25px' : '3px',
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
          {beansUsed && (
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                placeholder="Bean brand"
                value={beanBrand}
                onChange={e => setBeanBrand(e.target.value)}
                style={{ ...inputStyle, flex: 1 }}
                className="placeholder:text-[rgba(235,235,245,0.3)]"
              />
              <input
                type="number"
                placeholder="kg"
                value={beanAmount}
                onChange={e => setBeanAmount(e.target.value)}
                style={{ ...inputStyle, width: '80px', flex: 'none' }}
                className="placeholder:text-[rgba(235,235,245,0.3)]"
              />
            </div>
          )}
        </div>

        {/* Submit */}
        <button
          type="button"
          onClick={() => void handleSubmit(false)}
          disabled={!location || submitting || geofenceWarning != null}
          className="flex items-center justify-center gap-2 transition-all active:scale-[0.97]"
          style={{
            width: '100%',
            height: '50px',
            borderRadius: '14px',
            background: '#D97706',
            color: '#FFF',
            fontSize: '17px',
            fontWeight: 600,
            border: 'none',
            cursor: !location || submitting || geofenceWarning != null ? 'not-allowed' : 'pointer',
            opacity: !location || submitting || geofenceWarning != null ? 0.5 : 1,
          }}
        >
          {submitting && <Loader2 size={18} className="animate-spin" />}
          {submitting ? 'Submitting…' : 'Submit Check-in'}
        </button>
      </div>
    </div>
  )
}

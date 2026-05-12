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

const inputClass =
  'w-full rounded-xl bg-white/[0.07] px-3.5 py-3 text-[15px] text-white outline-none placeholder:text-[#636366] focus:bg-white/[0.10] transition-colors'

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
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="relative z-10 w-full rounded-t-3xl bg-[#1C1C1E] p-6 md:mx-4 md:max-w-md md:rounded-3xl">
        {/* Drag handle — mobile only */}
        <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-white/20 md:hidden" />

        {/* Header */}
        <div className="mb-5 flex items-start justify-between">
          <div>
            <h2 className="text-[20px] font-semibold text-white">Check In</h2>
            <div className="mt-1 flex items-center gap-2">
              <p className="text-[14px] text-[#8E8E93]">{lead.cafe_name}</p>
              <span
                className="rounded-lg px-1.5 py-0.5 text-[11px] font-semibold"
                style={{ backgroundColor: statusMeta.bg, color: statusMeta.color }}
              >
                {statusMeta.label}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-white/[0.07] p-2 text-[#8E8E93] transition-colors hover:text-white"
          >
            <X size={16} />
          </button>
        </div>

        {/* Type selector */}
        <div className="mb-5 flex gap-2">
          {CHECKIN_TYPES.map(t => (
            <button
              key={t}
              type="button"
              onClick={() => setCheckinType(t)}
              className={`flex-1 rounded-xl py-2.5 text-[14px] font-medium capitalize transition-all active:scale-[0.96] ${
                checkinType === t
                  ? 'bg-[#D97706] text-white'
                  : 'bg-white/[0.07] text-[#8E8E93]'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* GPS */}
        <div className="mb-4">
          {location ? (
            <div className="flex items-center gap-2 rounded-xl bg-[#30D158]/10 px-3.5 py-3">
              <MapPin size={14} className="text-[#30D158]" />
              <span className="flex-1 text-[13px] text-[#30D158]">Location captured</span>
            </div>
          ) : (
            <button
              type="button"
              onClick={captureLocation}
              disabled={gpsLoading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-white/[0.07] py-3 text-[14px] text-[#8E8E93] transition-all active:scale-[0.98] hover:text-white disabled:opacity-50"
            >
              {gpsLoading ? <Loader2 size={14} className="animate-spin" /> : <MapPin size={14} />}
              {gpsLoading ? 'Getting location…' : 'Capture Location'}
            </button>
          )}

          {/* GPS note (no lead GPS) */}
          {gpsNote && (
            <p className="mt-1.5 text-[12px] text-[#636366]">{gpsNote}</p>
          )}

          {/* Geofence warning */}
          {geofenceWarning && (
            <div className="mt-2 rounded-xl bg-[#FF453A]/10 p-3.5">
              <div className="flex items-center gap-2">
                <AlertTriangle size={14} className="flex-shrink-0 text-[#FF453A]" />
                <span className="text-[13px] text-[#FF453A]">
                  You are {geofenceWarning.distance}m away from this location
                </span>
              </div>
              <p className="mt-1 text-[12px] text-[#636366]">
                Check-in recorded but flagged for review
              </p>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={cancelGps}
                  className="flex-1 rounded-xl bg-white/[0.07] py-2 text-[13px] text-[#8E8E93] transition-colors hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void handleSubmit(true)}
                  disabled={submitting}
                  className="flex-1 rounded-xl bg-[#FF453A]/20 py-2 text-[13px] text-[#FF453A] transition-colors hover:bg-[#FF453A]/30 disabled:opacity-50"
                >
                  {submitting ? 'Submitting…' : 'Check In Anyway'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Remarks */}
        <div className="mb-3">
          <textarea
            rows={2}
            placeholder="Add notes…"
            value={remarks}
            onChange={e => setRemarks(e.target.value)}
            className={`${inputClass} resize-none`}
          />
        </div>

        {/* Gate pass */}
        <div className="mb-4">
          <input
            type="text"
            placeholder="Gate pass number (optional)"
            value={gatePass}
            onChange={e => setGatePass(e.target.value)}
            className={inputClass}
          />
        </div>

        {/* Beans toggle */}
        <div className="mb-5">
          <div className="mb-2.5 flex items-center justify-between">
            <span className="text-[15px] text-[#8E8E93]">Beans used?</span>
            <button
              type="button"
              onClick={() => setBeansUsed(v => !v)}
              className={`relative h-[28px] w-[50px] rounded-full transition-colors ${beansUsed ? 'bg-[#D97706]' : 'bg-[#3A3A3C]'}`}
            >
              <span
                className={`absolute top-[3px] h-[22px] w-[22px] rounded-full bg-white shadow-sm transition-transform ${
                  beansUsed ? 'left-[25px]' : 'left-[3px]'
                }`}
              />
            </button>
          </div>
          {beansUsed && (
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Bean brand"
                value={beanBrand}
                onChange={e => setBeanBrand(e.target.value)}
                className={`${inputClass} flex-1`}
              />
              <input
                type="number"
                placeholder="kg"
                value={beanAmount}
                onChange={e => setBeanAmount(e.target.value)}
                className={`${inputClass} w-20`}
              />
            </div>
          )}
        </div>

        {/* Submit */}
        <button
          type="button"
          onClick={() => void handleSubmit(false)}
          disabled={!location || submitting || geofenceWarning != null}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#D97706] py-[14px] text-[17px] font-semibold text-white transition-all active:scale-[0.98] hover:bg-[#B45309] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting && <Loader2 size={18} className="animate-spin" />}
          {submitting ? 'Submitting…' : 'Submit Check-in'}
        </button>
      </div>
    </div>
  )
}

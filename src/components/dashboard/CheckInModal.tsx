'use client'

import { useState } from 'react'
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
  cold_lead:      { label: 'Cold Lead',  color: '#3B82F6', bg: 'rgba(59,130,246,0.12)' },
  hot_lead:       { label: 'Hot Lead',   color: '#F97316', bg: 'rgba(249,115,22,0.12)' },
  demo_scheduled: { label: 'Demo',       color: '#D97706', bg: 'rgba(217,119,6,0.12)'  },
  customer:       { label: 'Customer',   color: '#22C55E', bg: 'rgba(34,197,94,0.12)'  },
  competitor:     { label: 'Competitor', color: '#EF4444', bg: 'rgba(239,68,68,0.12)'  },
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
      if (json.lead) onCheckedIn?.(json.lead)
      onClose()
    } catch {
      toast.error('Failed to submit check-in. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const inputClass =
    'w-full rounded-lg border border-[#2A2A2A] bg-[#111] px-3 py-2.5 text-sm text-white outline-none placeholder:text-[#555] focus:border-[#D97706] focus:ring-1 focus:ring-amber-600/20 transition-colors'

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />

      {/* Panel */}
      <div className="relative z-10 w-full rounded-t-2xl bg-[#1A1A1A] p-6 md:mx-4 md:max-w-md md:rounded-2xl">
        {/* Header */}
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="text-[16px] font-semibold text-white">Check In</h2>
            <div className="mt-1 flex items-center gap-2">
              <p className="text-[13px] text-[#7A7A7A]">{lead.cafe_name}</p>
              <span
                className="rounded-md px-1.5 py-0.5 text-[10px] font-medium"
                style={{ backgroundColor: statusMeta.bg, color: statusMeta.color }}
              >
                {statusMeta.label}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-[#2A2A2A] p-1.5 text-[#7A7A7A] hover:text-white transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Type selector */}
        <div className="mb-4 flex gap-2">
          {CHECKIN_TYPES.map(t => (
            <button
              key={t}
              type="button"
              onClick={() => setCheckinType(t)}
              className={`flex-1 rounded-lg py-2 text-[13px] font-medium capitalize transition-colors ${
                checkinType === t
                  ? 'bg-[#D97706] text-white'
                  : 'border border-[#2A2A2A] bg-[#111] text-[#7A7A7A] hover:text-white'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* GPS */}
        <div className="mb-4">
          {location ? (
            <div className="flex items-center gap-2 rounded-lg border border-[#22C55E]/30 bg-[#22C55E]/10 px-3 py-2.5">
              <MapPin size={14} className="text-[#22C55E]" />
              <span className="flex-1 text-[12px] text-[#22C55E]">Location captured</span>
            </div>
          ) : (
            <button
              type="button"
              onClick={captureLocation}
              disabled={gpsLoading}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-[#2A2A2A] py-2.5 text-[13px] text-[#A0A0A0] hover:border-[#D97706] hover:text-[#D97706] disabled:opacity-50 transition-colors"
            >
              {gpsLoading ? <Loader2 size={14} className="animate-spin" /> : <MapPin size={14} />}
              {gpsLoading ? 'Getting location…' : 'Capture Location'}
            </button>
          )}

          {/* GPS note (no lead GPS) */}
          {gpsNote && (
            <p className="mt-1.5 text-[11px] text-[#555]">{gpsNote}</p>
          )}

          {/* Geofence warning */}
          {geofenceWarning && (
            <div className="mt-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3">
              <div className="flex items-center gap-2">
                <AlertTriangle size={14} className="flex-shrink-0 text-red-400" />
                <span className="text-[12px] text-red-400">
                  You are {geofenceWarning.distance}m away from this location
                </span>
              </div>
              <p className="mt-1 text-[11px] text-[#555]">
                Check-in recorded but flagged for review
              </p>
              <div className="mt-2.5 flex gap-2">
                <button
                  type="button"
                  onClick={cancelGps}
                  className="flex-1 rounded-md border border-[#2A2A2A] py-1.5 text-[12px] text-[#A0A0A0] hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void handleSubmit(true)}
                  disabled={submitting}
                  className="flex-1 rounded-md border border-red-500/30 bg-red-500/20 py-1.5 text-[12px] text-red-400 hover:bg-red-500/30 disabled:opacity-50 transition-colors"
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
        <div className="mb-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[13px] text-[#A0A0A0]">Beans used?</span>
            <button
              type="button"
              onClick={() => setBeansUsed(v => !v)}
              className={`relative h-5 w-10 rounded-full transition-colors ${beansUsed ? 'bg-[#D97706]' : 'bg-[#333]'}`}
            >
              <span
                className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                  beansUsed ? 'left-5' : 'left-0.5'
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

        {/* Submit — disabled when geofence warning is active (force explicit "Check In Anyway") */}
        <button
          type="button"
          onClick={() => void handleSubmit(false)}
          disabled={!location || submitting || geofenceWarning != null}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#D97706] py-2.5 text-sm font-semibold text-white hover:bg-[#B45309] disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
        >
          {submitting && <Loader2 size={16} className="animate-spin" />}
          {submitting ? 'Submitting…' : 'Submit Check-in'}
        </button>
      </div>
    </div>
  )
}

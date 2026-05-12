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

const inputClass =
  'w-full rounded-xl bg-white/[0.07] px-3.5 py-3 text-[15px] text-white outline-none placeholder:text-[#636366] focus:bg-white/[0.10] transition-colors'
const labelClass = 'mb-1.5 block text-[12px] font-medium uppercase tracking-wide text-[#8E8E93]'

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
      // Reset form
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
    <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="relative z-10 max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-[#1C1C1E] p-6 md:mx-4 md:max-w-md md:rounded-3xl">
        {/* Drag handle — mobile only */}
        <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-white/20 md:hidden" />

        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-[20px] font-semibold text-white">New Lead</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-white/[0.07] p-2 text-[#8E8E93] transition-colors hover:text-white"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {/* Cafe Name */}
          <div>
            <label className={labelClass}>Cafe Name *</label>
            <input
              type="text"
              placeholder="Blue Tokai, Third Wave…"
              value={cafeName}
              onChange={e => setCafeName(e.target.value)}
              required
              className={inputClass}
            />
          </div>

          {/* Status */}
          <div>
            <label className={labelClass}>Status *</label>
            <select
              value={status}
              onChange={e => setStatus(e.target.value as LeadStatus)}
              className={`${inputClass} cursor-pointer`}
            >
              {STATUSES.map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>

          {/* GPS + Address */}
          <div>
            <label className={labelClass}>Location *</label>
            {location ? (
              <div className="mb-3 flex items-center gap-2 rounded-xl bg-[#30D158]/10 px-3.5 py-3">
                <MapPin size={13} className="text-[#30D158]" />
                <span className="text-[13px] text-[#30D158]">GPS captured</span>
              </div>
            ) : (
              <button
                type="button"
                onClick={captureLocation}
                disabled={gpsLoading}
                className="mb-3 flex w-full items-center justify-center gap-2 rounded-xl bg-white/[0.07] py-3 text-[14px] text-[#8E8E93] transition-all active:scale-[0.98] hover:text-white disabled:opacity-50"
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
                className={inputClass}
              />
            )}
          </div>

          {/* POC Name */}
          <div>
            <label className={labelClass}>POC Name</label>
            <input
              type="text"
              placeholder="Contact person's name"
              value={pocName}
              onChange={e => setPocName(e.target.value)}
              className={inputClass}
            />
          </div>

          {/* POC Contact */}
          <div>
            <label className={labelClass}>POC Contact</label>
            <input
              type="tel"
              placeholder="+91 XXXXX XXXXX"
              value={pocContact}
              onChange={e => { setPocContact(e.target.value); setPocError('') }}
              onBlur={handleContactBlur}
              className={`${inputClass} ${pocError ? 'ring-1 ring-[#FF453A]' : ''}`}
            />
            {pocError && <p className="mt-1.5 text-[12px] text-[#FF453A]">{pocError}</p>}
          </div>

          {/* Remarks */}
          <div>
            <label className={labelClass}>Remarks</label>
            <textarea
              rows={2}
              placeholder="Any notes…"
              value={remarks}
              onChange={e => setRemarks(e.target.value)}
              className={`${inputClass} resize-none`}
            />
          </div>

          <button
            type="submit"
            disabled={!canSubmit || submitting}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#D97706] py-[14px] text-[17px] font-semibold text-white transition-all active:scale-[0.98] hover:bg-[#B45309] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting && <Loader2 size={18} className="animate-spin" />}
            {submitting ? 'Adding…' : 'Add Lead'}
          </button>
        </form>
      </div>
    </div>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { Loader2, X } from 'lucide-react'
import { toast } from 'sonner'
import type { CheckInType, Lead, Profile } from '@/types'

interface Props {
  lead: Lead
  isOpen: boolean
  onClose: () => void
  onScheduled: (lead: Lead) => void
  profile: Profile
}

const VISIT_TYPES: { value: CheckInType; label: string }[] = [
  { value: 'visit',    label: 'Visit' },
  { value: 'demo',     label: 'Demo' },
  { value: 'workshop', label: 'Workshop' },
]

const inputClass =
  'w-full rounded-xl bg-white/[0.07] px-3.5 py-3 text-[15px] text-white outline-none placeholder:text-[#636366] focus:bg-white/[0.10] transition-colors'

export default function ScheduleModal({ lead, isOpen, onClose, onScheduled }: Props) {
  const [visitType, setVisitType] = useState<CheckInType>('visit')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [time, setTime] = useState('09:00')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    if (isOpen) document.addEventListener('keydown', handleEsc)
    return () => document.removeEventListener('keydown', handleEsc)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const today = new Date().toISOString().split('T')[0]

  async function handleSubmit() {
    if (!date) return
    setSubmitting(true)
    setError('')
    try {
      const scheduledDateTime = new Date(`${date}T${time || '09:00'}`)
      const body = {
        scheduled_date: scheduledDateTime.toISOString(),
        scheduled_type: visitType,
        ...(notes.trim() ? { remarks: notes.trim() } : {}),
      }
      const res = await fetch(`/api/leads/${lead.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const err = await res.json() as { error?: string }
        console.error('Schedule error:', err)
        setError('Failed to schedule: ' + (err.error ?? 'unknown'))
        return
      }
      const { lead: updated } = await res.json() as { lead: Lead }
      onScheduled(updated)
      onClose()
      toast.success('Visit scheduled!')
    } catch {
      setError('Failed to schedule. Please try again.')
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
            <h2 className="text-[20px] font-semibold text-white">Schedule Visit</h2>
            <p className="mt-0.5 text-[14px] text-[#8E8E93]">{lead.cafe_name}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-white/[0.07] p-2 text-[#8E8E93] transition-colors hover:text-white"
          >
            <X size={16} />
          </button>
        </div>

        {/* Visit type selector */}
        <div className="mb-5 flex gap-2">
          {VISIT_TYPES.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => setVisitType(value)}
              className={`flex-1 rounded-xl py-2.5 text-[14px] font-medium capitalize transition-all active:scale-[0.96] ${
                visitType === value
                  ? 'bg-[#D97706] text-white'
                  : 'bg-white/[0.07] text-[#8E8E93]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Date */}
        <div className="mb-3">
          <p className="mb-1.5 text-[12px] font-medium uppercase tracking-wide text-[#8E8E93]">Date *</p>
          <input
            type="date"
            value={date}
            min={today}
            onChange={e => setDate(e.target.value)}
            className={inputClass}
            style={{ colorScheme: 'dark' }}
          />
        </div>

        {/* Time */}
        <div className="mb-3">
          <p className="mb-1.5 text-[12px] font-medium uppercase tracking-wide text-[#8E8E93]">Time</p>
          <input
            type="time"
            value={time}
            onChange={e => setTime(e.target.value)}
            className={inputClass}
            style={{ colorScheme: 'dark' }}
          />
        </div>

        {/* Notes */}
        <div className="mb-5">
          <p className="mb-1.5 text-[12px] font-medium uppercase tracking-wide text-[#8E8E93]">Notes</p>
          <textarea
            rows={2}
            placeholder="Add notes…"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            className={`${inputClass} resize-none`}
          />
        </div>

        {error && (
          <p className="mb-3 text-[13px] text-[#FF453A]">{error}</p>
        )}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={!date || submitting}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#D97706] py-[14px] text-[17px] font-semibold text-white transition-all active:scale-[0.98] hover:bg-[#B45309] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting && <Loader2 size={18} className="animate-spin" />}
          {submitting ? 'Scheduling…' : 'Confirm Schedule'}
        </button>
      </div>
    </div>
  )
}

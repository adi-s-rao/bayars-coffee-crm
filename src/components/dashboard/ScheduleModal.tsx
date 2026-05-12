'use client'

import { useState } from 'react'
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
  'w-full rounded-lg border border-[#2A2A2A] bg-[#111] px-3 py-2.5 text-sm text-white outline-none focus:border-[#D97706] focus:ring-1 focus:ring-amber-600/20 transition-colors'

export default function ScheduleModal({ lead, isOpen, onClose, onScheduled }: Props) {
  const [visitType, setVisitType] = useState<CheckInType>('visit')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [time, setTime] = useState('09:00')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

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
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />

      {/* Panel */}
      <div className="relative z-10 w-full rounded-t-2xl bg-[#1A1A1A] p-6 md:mx-4 md:max-w-md md:rounded-2xl">
        {/* Header */}
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="text-[16px] font-semibold text-white">Schedule Visit</h2>
            <p className="mt-0.5 text-[13px] text-[#7A7A7A]">{lead.cafe_name}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-[#2A2A2A] p-1.5 text-[#7A7A7A] hover:text-white transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Visit type selector */}
        <div className="mb-4 flex gap-2">
          {VISIT_TYPES.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => setVisitType(value)}
              className={`flex-1 rounded-lg py-2 text-[13px] font-medium capitalize transition-colors ${
                visitType === value
                  ? 'bg-[#D97706] text-white'
                  : 'border border-[#2A2A2A] bg-[#111] text-[#7A7A7A] hover:text-white'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Date */}
        <div className="mb-3">
          <p className="mb-1.5 text-[12px] font-medium text-[#A0A0A0]">Date *</p>
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
          <p className="mb-1.5 text-[12px] font-medium text-[#A0A0A0]">Time</p>
          <input
            type="time"
            value={time}
            onChange={e => setTime(e.target.value)}
            className={inputClass}
            style={{ colorScheme: 'dark' }}
          />
        </div>

        {/* Notes */}
        <div className="mb-4">
          <p className="mb-1.5 text-[12px] font-medium text-[#A0A0A0]">Notes</p>
          <textarea
            rows={2}
            placeholder="Add notes..."
            value={notes}
            onChange={e => setNotes(e.target.value)}
            className={`${inputClass} resize-none`}
          />
        </div>

        {error && (
          <p className="mb-3 text-[13px] text-red-400">{error}</p>
        )}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={!date || submitting}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#D97706] py-2.5 text-sm font-semibold text-white hover:bg-[#B45309] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {submitting && <Loader2 size={16} className="animate-spin" />}
          {submitting ? 'Scheduling…' : 'Confirm Schedule'}
        </button>
      </div>
    </div>
  )
}

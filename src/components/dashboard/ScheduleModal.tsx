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
  colorScheme: 'dark',
}

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
            <h2 style={{ fontSize: '20px', fontWeight: 600, color: '#FFF' }}>Schedule Visit</h2>
            <p style={{ marginTop: '2px', fontSize: '15px', color: 'rgba(235,235,245,0.6)' }}>{lead.cafe_name}</p>
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

        {/* Visit type selector */}
        <div style={{ marginBottom: '20px', display: 'flex', gap: '8px' }}>
          {VISIT_TYPES.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => setVisitType(value)}
              className="flex-1 transition-all active:scale-[0.95]"
              style={{
                height: '44px',
                borderRadius: '10px',
                fontSize: '15px',
                fontWeight: 500,
                border: 'none',
                cursor: 'pointer',
                background: visitType === value ? '#D97706' : 'rgba(118,118,128,0.2)',
                color: visitType === value ? '#FFF' : 'rgba(235,235,245,0.6)',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Date/Time card */}
        <div
          style={{
            background: 'rgba(118,118,128,0.12)',
            borderRadius: '12px',
            overflow: 'hidden',
            marginBottom: '16px',
          }}
        >
          {/* Date row */}
          <div
            style={{
              padding: '14px 16px',
              borderBottom: '0.5px solid rgba(84,84,88,0.65)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span style={{ fontSize: '17px', color: '#FFF' }}>Date</span>
            <input
              type="date"
              value={date}
              min={today}
              onChange={e => setDate(e.target.value)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#D97706',
                fontSize: '17px',
                textAlign: 'right',
                outline: 'none',
                colorScheme: 'dark',
                cursor: 'pointer',
              }}
            />
          </div>
          {/* Time row */}
          <div
            style={{
              padding: '14px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span style={{ fontSize: '17px', color: '#FFF' }}>Time</span>
            <input
              type="time"
              value={time}
              onChange={e => setTime(e.target.value)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#D97706',
                fontSize: '17px',
                textAlign: 'right',
                outline: 'none',
                colorScheme: 'dark',
                cursor: 'pointer',
              }}
            />
          </div>
        </div>

        {/* Notes */}
        <div style={{ marginBottom: '20px' }}>
          <p
            style={{
              marginBottom: '6px',
              fontSize: '13px',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              color: 'rgba(235,235,245,0.4)',
            }}
          >
            Notes
          </p>
          <textarea
            rows={2}
            placeholder="Add notes…"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            style={{ ...inputStyle, resize: 'none' }}
            className="placeholder:text-[rgba(235,235,245,0.3)]"
          />
        </div>

        {error && (
          <p style={{ marginBottom: '12px', fontSize: '13px', color: '#FF453A' }}>{error}</p>
        )}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={!date || submitting}
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
            cursor: !date || submitting ? 'not-allowed' : 'pointer',
            opacity: !date || submitting ? 0.5 : 1,
          }}
        >
          {submitting && <Loader2 size={18} className="animate-spin" />}
          {submitting ? 'Scheduling…' : 'Confirm Schedule'}
        </button>
      </div>
    </div>
  )
}

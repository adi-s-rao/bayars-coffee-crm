'use client'

import { useEffect, useState } from 'react'
import { Loader2, X } from 'lucide-react'
import { toast } from 'sonner'
import type { Lead, Profile, VisitType } from '@/types'
import DateTimePicker from '@/components/ui/DateTimePicker'

interface RepMember {
  id: string
  full_name: string
  role: string
}

interface Props {
  lead: Lead
  isOpen: boolean
  onClose: () => void
  onScheduled: (lead: Lead) => void
  profile: Profile
}

const VISIT_TYPES: { value: VisitType; label: string }[] = [
  { value: 'visit',    label: 'Visit' },
  { value: 'demo',     label: 'Demo' },
  { value: 'workshop', label: 'Workshop' },
]

export default function ScheduleModal({ lead, isOpen, onClose, onScheduled, profile }: Props) {
  const [visitType, setVisitType] = useState<VisitType>('visit')
  const [scheduledDate, setScheduledDate] = useState<Date | null>(null)
  const [datePickerOpen, setDatePickerOpen] = useState(false)
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [reps, setReps] = useState<RepMember[]>([])
  const [assignedTo, setAssignedTo] = useState<string>(profile.id)

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    if (isOpen) document.addEventListener('keydown', handleEsc)
    return () => document.removeEventListener('keydown', handleEsc)
  }, [isOpen, onClose])

  useEffect(() => {
    if (!isOpen) return
    setAssignedTo(profile.id)
    if (profile.role === 'manager') {
      fetch('/api/team/members')
        .then(r => r.json())
        .then((data: { members: RepMember[] }) => setReps(data.members ?? []))
        .catch(() => {})
    }
  }, [isOpen, profile.id, profile.role])

  if (!isOpen) return null

  async function handleSubmit() {
    if (!scheduledDate) return
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch('/api/scheduled-visits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lead_id: lead.id,
          assigned_to: assignedTo,
          scheduled_date: scheduledDate.toISOString().split('T')[0],
          visit_type: visitType,
          notes: notes.trim() || undefined,
        }),
      })
      if (!res.ok) {
        const err = await res.json() as { error?: string }
        setError('Failed to schedule: ' + (err.error ?? 'unknown'))
        return
      }
      toast.success('Visit scheduled!')
      onScheduled(lead)
      onClose()
    } catch {
      setError('Failed to schedule. Please try again.')
    } finally {
      setSubmitting(false)
    }
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

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1100, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }} onClick={onClose} />

      <div
        style={{
          position: 'relative',
          zIndex: 10,
          width: '100%',
          maxWidth: '448px',
          background: 'var(--bg-card)',
          borderRadius: '24px 24px 0 0',
          padding: '24px',
          paddingBottom: 90,
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
      >
        <div style={{ width: '36px', height: '4px', borderRadius: '2px', background: 'rgba(235,235,245,0.2)', margin: '0 auto 20px' }} />

        <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--label-primary)' }}>Schedule Visit</h2>
            <p style={{ marginTop: '2px', fontSize: '15px', color: 'var(--label-secondary)' }}>{lead.cafe_name}</p>
          </div>
          <button type="button" onClick={onClose} style={{ background: 'var(--bg-input)', border: 'none', borderRadius: '10px', padding: '8px', color: 'var(--label-secondary)', cursor: 'pointer' }}>
            <X size={16} />
          </button>
        </div>

        {/* Assign To (manager only) */}
        {profile.role === 'manager' && reps.length > 0 && (
          <div style={{ marginBottom: '20px' }}>
            <p style={{ marginBottom: '6px', fontSize: '13px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--label-tertiary)' }}>Assign To</p>
            <select value={assignedTo} onChange={e => setAssignedTo(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
              {reps.map(r => (
                <option key={r.id} value={r.id}>{r.full_name} {r.role === 'manager' ? '(manager)' : ''}</option>
              ))}
            </select>
          </div>
        )}

        {/* Visit type */}
        <div style={{ marginBottom: '20px', display: 'flex', gap: '8px' }}>
          {VISIT_TYPES.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => setVisitType(value)}
              className="flex-1 transition-all active:scale-[0.95]"
              style={{ height: '44px', borderRadius: '10px', fontSize: '15px', fontWeight: 500, border: 'none', cursor: 'pointer', background: visitType === value ? '#D97706' : 'rgba(118,118,128,0.2)', color: visitType === value ? '#FFF' : 'var(--label-secondary)', fontFamily: 'inherit' }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Date picker */}
        <div style={{ marginBottom: '16px' }}>
          <DateTimePicker
            value={scheduledDate}
            onChange={d => setScheduledDate(prev => {
              if (!prev) return d
              const merged = new Date(d)
              merged.setHours(prev.getHours(), prev.getMinutes(), 0, 0)
              return merged
            })}
            mode="date"
            label="Date"
            placeholder="Select date"
            isOpen={datePickerOpen}
            onOpen={() => setDatePickerOpen(true)}
            onClose={() => setDatePickerOpen(false)}
          />
        </div>

        {/* Notes */}
        <div style={{ marginBottom: '20px' }}>
          <p style={{ marginBottom: '6px', fontSize: '13px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--label-tertiary)' }}>Notes</p>
          <textarea rows={2} placeholder="Add notes…" value={notes} onChange={e => setNotes(e.target.value)} style={{ ...inputStyle, resize: 'none' }} className="placeholder:text-[rgba(235,235,245,0.3)]" />
        </div>

        {error && <p style={{ marginBottom: '12px', fontSize: '13px', color: '#FF453A' }}>{error}</p>}

        <button
          type="button"
          onClick={() => void handleSubmit()}
          disabled={!scheduledDate || submitting}
          className="flex items-center justify-center gap-2 transition-all active:scale-[0.97]"
          style={{ width: '100%', height: '50px', borderRadius: '14px', background: '#D97706', color: '#FFF', fontSize: '17px', fontWeight: 600, border: 'none', cursor: !scheduledDate || submitting ? 'not-allowed' : 'pointer', opacity: !scheduledDate || submitting ? 0.5 : 1, fontFamily: 'inherit' }}
        >
          {submitting && <Loader2 size={18} className="animate-spin" />}
          {submitting ? 'Scheduling…' : 'Confirm Schedule'}
        </button>
      </div>
    </div>
  )
}

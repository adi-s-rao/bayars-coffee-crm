'use client'

import { useEffect, useState } from 'react'
import { Loader2, Search, X } from 'lucide-react'
import { toast } from 'sonner'
import type { CheckInType, Lead } from '@/types'
import DateTimePicker from '@/components/ui/DateTimePicker'

const VISIT_TYPES: { value: CheckInType; label: string }[] = [
  { value: 'visit',    label: 'Visit' },
  { value: 'demo',     label: 'Demo' },
  { value: 'workshop', label: 'Workshop' },
]

const STATUS_COLOR: Record<string, string> = {
  cold_lead:      '#0A84FF',
  hot_lead:       '#FF9F0A',
  demo_scheduled: '#D97706',
  customer:       '#30D158',
  competitor:     '#FF453A',
}

const STATUS_LABEL: Record<string, string> = {
  cold_lead:      'Cold Lead',
  hot_lead:       'Hot Lead',
  demo_scheduled: 'Demo',
  customer:       'Customer',
  competitor:     'Competitor',
}

interface Props {
  isOpen: boolean
  onClose: () => void
  selectedDate: Date | null
  onScheduled: () => void
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

export default function NewScheduleModal({ isOpen, onClose, selectedDate, onScheduled }: Props) {
  const [allLeads, setAllLeads] = useState<Lead[]>([])
  const [leadsLoading, setLeadsLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [pickedLead, setPickedLead] = useState<Lead | null>(null)
  const [visitType, setVisitType] = useState<CheckInType>('visit')
  const [scheduledDate, setScheduledDate] = useState<Date | null>(null)
  const [datePickerOpen, setDatePickerOpen] = useState(false)
  const [timePickerOpen, setTimePickerOpen] = useState(false)
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    if (isOpen) document.addEventListener('keydown', handleEsc)
    return () => document.removeEventListener('keydown', handleEsc)
  }, [isOpen, onClose])

  useEffect(() => {
    if (!isOpen) return
    const d = new Date(selectedDate ?? new Date())
    d.setHours(9, 0, 0, 0)
    setScheduledDate(d)
    setLeadsLoading(true)
    fetch('/api/leads')
      .then(r => r.json())
      .then((data: { leads: Lead[] }) => setAllLeads(data.leads ?? []))
      .catch(() => setAllLeads([]))
      .finally(() => setLeadsLoading(false))
  }, [isOpen, selectedDate])

  if (!isOpen) return null

  const filteredLeads = allLeads.filter(l =>
    l.cafe_name.toLowerCase().includes(search.toLowerCase())
  )

  async function handleSubmit() {
    if (!pickedLead || !scheduledDate) return
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch(`/api/leads/${pickedLead.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scheduled_date: scheduledDate.toISOString(),
          scheduled_type: visitType,
          ...(notes.trim() ? { remarks: notes.trim() } : {}),
        }),
      })
      if (!res.ok) {
        const err = await res.json() as { error?: string }
        setError('Failed to schedule: ' + (err.error ?? 'unknown'))
        return
      }
      toast.success('Visit scheduled!')
      onScheduled()
      onClose()
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
        className="relative z-10 w-full overflow-y-auto md:mx-4 md:max-w-md md:rounded-3xl"
        style={{ background: 'var(--bg-card)', borderRadius: '24px 24px 0 0', padding: '24px', maxHeight: '90vh' }}
      >
        {/* Drag handle */}
        <div style={{ width: '36px', height: '4px', borderRadius: '2px', background: 'rgba(235,235,245,0.2)', margin: '0 auto 20px' }} className="md:hidden" />

        {/* Header */}
        <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--label-primary)' }}>Schedule Visit</h2>
          <button
            type="button"
            onClick={onClose}
            className="transition-colors active:scale-[0.92]"
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

        {/* Lead selector */}
        <div style={{ marginBottom: '20px' }}>
          <p
            style={{
              marginBottom: '6px',
              fontSize: '13px',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              color: 'var(--label-tertiary)',
            }}
          >
            Select Lead *
          </p>
          {pickedLead ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                background: 'rgba(217,119,6,0.1)',
                borderRadius: '10px',
                padding: '12px 14px',
              }}
            >
              <span
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: STATUS_COLOR[pickedLead.status],
                  flexShrink: 0,
                }}
              />
              <span style={{ flex: 1, fontSize: '15px', color: 'var(--label-primary)' }}>{pickedLead.cafe_name}</span>
              <button
                type="button"
                onClick={() => setPickedLead(null)}
                style={{ color: 'var(--label-tertiary)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <div>
              <div style={{ position: 'relative', marginBottom: '8px' }}>
                <Search
                  size={14}
                  style={{
                    position: 'absolute',
                    left: '14px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--label-tertiary)',
                    pointerEvents: 'none',
                  }}
                />
                <input
                  type="text"
                  placeholder="Search cafes…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  style={{ ...inputStyle, paddingLeft: '36px' }}
                  className="placeholder:text-[rgba(235,235,245,0.3)]"
                />
              </div>
              <div
                style={{
                  maxHeight: '144px',
                  overflowY: 'auto',
                  borderRadius: '10px',
                  background: 'rgba(118,118,128,0.08)',
                }}
              >
                {leadsLoading ? (
                  <p style={{ padding: '12px 14px', fontSize: '13px', color: 'var(--label-tertiary)' }}>Loading…</p>
                ) : filteredLeads.length === 0 ? (
                  <p style={{ padding: '12px 14px', fontSize: '13px', color: 'var(--label-tertiary)' }}>No leads found</p>
                ) : (
                  filteredLeads.map(l => (
                    <button
                      key={l.id}
                      type="button"
                      onClick={() => { setPickedLead(l); setSearch('') }}
                      className="flex w-full items-center gap-2.5 transition-colors hover:bg-white/[0.05]"
                      style={{ padding: '10px 14px', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer' }}
                    >
                      <span
                        style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          background: STATUS_COLOR[l.status],
                          flexShrink: 0,
                        }}
                      />
                      <span style={{ flex: 1, fontSize: '14px', color: 'var(--label-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {l.cafe_name}
                      </span>
                      <span
                        style={{
                          flexShrink: 0,
                          borderRadius: '6px',
                          padding: '2px 6px',
                          fontSize: '11px',
                          fontWeight: 500,
                          background: `${STATUS_COLOR[l.status]}20`,
                          color: STATUS_COLOR[l.status],
                        }}
                      >
                        {STATUS_LABEL[l.status]}
                      </span>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Visit type */}
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
                color: visitType === value ? '#FFF' : 'var(--label-secondary)',
                fontFamily: 'inherit',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Date picker */}
        <div style={{ marginBottom: '10px' }}>
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

        {/* Time picker */}
        <div style={{ marginBottom: '16px' }}>
          <DateTimePicker
            value={scheduledDate}
            onChange={d => setScheduledDate(prev => {
              if (!prev) return d
              const merged = new Date(prev)
              merged.setHours(d.getHours(), d.getMinutes(), 0, 0)
              return merged
            })}
            mode="time"
            label="Time"
            placeholder="Select time"
            isOpen={timePickerOpen}
            onOpen={() => setTimePickerOpen(true)}
            onClose={() => setTimePickerOpen(false)}
          />
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
              color: 'var(--label-tertiary)',
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

        {error && <p style={{ marginBottom: '12px', fontSize: '13px', color: '#FF453A' }}>{error}</p>}

        <button
          type="button"
          onClick={() => void handleSubmit()}
          disabled={!pickedLead || !scheduledDate || submitting}
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
            cursor: !pickedLead || !scheduledDate || submitting ? 'not-allowed' : 'pointer',
            opacity: !pickedLead || !scheduledDate || submitting ? 0.5 : 1,
            fontFamily: 'inherit',
          }}
        >
          {submitting && <Loader2 size={18} className="animate-spin" />}
          {submitting ? 'Scheduling…' : 'Schedule Visit'}
        </button>
      </div>
    </div>
  )
}

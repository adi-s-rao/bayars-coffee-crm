'use client'

import { useEffect, useState } from 'react'
import { Loader2, Search, X } from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'
import type { CheckInType, Lead } from '@/types'

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

const inputClass =
  'w-full rounded-xl bg-white/[0.07] px-3.5 py-3 text-[15px] text-white outline-none placeholder:text-[#636366] focus:bg-white/[0.10] transition-colors'

export default function NewScheduleModal({ isOpen, onClose, selectedDate, onScheduled }: Props) {
  const [allLeads, setAllLeads] = useState<Lead[]>([])
  const [leadsLoading, setLeadsLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [pickedLead, setPickedLead] = useState<Lead | null>(null)
  const [visitType, setVisitType] = useState<CheckInType>('visit')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('09:00')
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
    setDate(format(selectedDate ?? new Date(), 'yyyy-MM-dd'))
    setLeadsLoading(true)
    fetch('/api/leads')
      .then(r => r.json())
      .then((d: { leads: Lead[] }) => setAllLeads(d.leads ?? []))
      .catch(() => setAllLeads([]))
      .finally(() => setLeadsLoading(false))
  }, [isOpen, selectedDate])

  if (!isOpen) return null

  const filteredLeads = allLeads.filter(l =>
    l.cafe_name.toLowerCase().includes(search.toLowerCase())
  )

  async function handleSubmit() {
    if (!pickedLead || !date) return
    setSubmitting(true)
    setError('')
    try {
      const scheduledDateTime = new Date(`${date}T${time || '09:00'}`)
      const res = await fetch(`/api/leads/${pickedLead.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scheduled_date: scheduledDateTime.toISOString(),
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
      <div className="relative z-10 max-h-[90vh] w-full overflow-y-auto rounded-t-3xl bg-[#1C1C1E] p-6 md:mx-4 md:max-w-md md:rounded-3xl">
        {/* Drag handle — mobile only */}
        <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-white/20 md:hidden" />

        {/* Header */}
        <div className="mb-5 flex items-start justify-between">
          <h2 className="text-[20px] font-semibold text-white">Schedule Visit</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-white/[0.07] p-2 text-[#8E8E93] transition-colors hover:text-white"
          >
            <X size={16} />
          </button>
        </div>

        {/* Lead selector */}
        <div className="mb-5">
          <p className="mb-1.5 text-[12px] font-medium uppercase tracking-wide text-[#8E8E93]">Select Lead *</p>
          {pickedLead ? (
            <div className="flex items-center gap-2.5 rounded-xl bg-[#D97706]/10 px-3.5 py-3">
              <span
                className="h-2 w-2 flex-shrink-0 rounded-full"
                style={{ backgroundColor: STATUS_COLOR[pickedLead.status] }}
              />
              <span className="flex-1 text-[15px] text-white">{pickedLead.cafe_name}</span>
              <button
                type="button"
                onClick={() => setPickedLead(null)}
                className="text-[#636366] transition-colors hover:text-white"
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <div>
              <div className="relative mb-2">
                <Search
                  size={14}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#636366]"
                />
                <input
                  type="text"
                  placeholder="Search cafes…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className={`${inputClass} pl-9`}
                />
              </div>
              <div className="max-h-36 overflow-y-auto rounded-xl bg-white/[0.04]">
                {leadsLoading ? (
                  <p className="px-3.5 py-2.5 text-[13px] text-[#636366]">Loading…</p>
                ) : filteredLeads.length === 0 ? (
                  <p className="px-3.5 py-2.5 text-[13px] text-[#636366]">No leads found</p>
                ) : (
                  filteredLeads.map(l => (
                    <button
                      key={l.id}
                      type="button"
                      onClick={() => { setPickedLead(l); setSearch('') }}
                      className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left transition-colors hover:bg-white/[0.05]"
                    >
                      <span
                        className="h-2 w-2 flex-shrink-0 rounded-full"
                        style={{ backgroundColor: STATUS_COLOR[l.status] }}
                      />
                      <span className="flex-1 truncate text-[14px] text-white">{l.cafe_name}</span>
                      <span
                        className="flex-shrink-0 rounded-lg px-1.5 py-0.5 text-[11px] font-medium"
                        style={{
                          backgroundColor: `${STATUS_COLOR[l.status]}20`,
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

        {error && <p className="mb-3 text-[13px] text-[#FF453A]">{error}</p>}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={!pickedLead || !date || submitting}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#D97706] py-[14px] text-[17px] font-semibold text-white transition-all active:scale-[0.98] hover:bg-[#B45309] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting && <Loader2 size={18} className="animate-spin" />}
          {submitting ? 'Scheduling…' : 'Schedule Visit'}
        </button>
      </div>
    </div>
  )
}

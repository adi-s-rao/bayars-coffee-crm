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
  cold_lead:      '#3B82F6',
  hot_lead:       '#F97316',
  demo_scheduled: '#D97706',
  customer:       '#22C55E',
  competitor:     '#EF4444',
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
  'w-full rounded-lg border border-[#2A2A2A] bg-[#111] px-3 py-2.5 text-sm text-white outline-none focus:border-[#D97706] focus:ring-1 focus:ring-amber-600/20 transition-colors placeholder:text-[#555]'

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
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative z-10 max-h-[90vh] w-full overflow-y-auto rounded-t-2xl bg-[#1A1A1A] p-6 md:mx-4 md:max-w-md md:rounded-2xl">

        {/* Header */}
        <div className="mb-4 flex items-start justify-between">
          <h2 className="text-[16px] font-semibold text-white">Schedule Visit</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-[#2A2A2A] p-1.5 text-[#7A7A7A] hover:text-white transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Lead selector */}
        <div className="mb-4">
          <p className="mb-1.5 text-[12px] font-medium text-[#A0A0A0]">Select Lead *</p>
          {pickedLead ? (
            <div className="flex items-center gap-2 rounded-lg border border-[#D97706]/40 bg-[#D97706]/10 px-3 py-2.5">
              <span
                className="h-2 w-2 flex-shrink-0 rounded-full"
                style={{ backgroundColor: STATUS_COLOR[pickedLead.status] }}
              />
              <span className="flex-1 text-[13px] text-white">{pickedLead.cafe_name}</span>
              <button
                type="button"
                onClick={() => setPickedLead(null)}
                className="text-[#555] hover:text-white transition-colors"
              >
                <X size={12} />
              </button>
            </div>
          ) : (
            <div>
              <div className="relative mb-2">
                <Search
                  size={13}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#555]"
                />
                <input
                  type="text"
                  placeholder="Search cafes…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className={`${inputClass} pl-8`}
                />
              </div>
              <div className="max-h-36 overflow-y-auto rounded-lg border border-[#2A2A2A]">
                {leadsLoading ? (
                  <p className="px-3 py-2 text-[12px] text-[#555]">Loading…</p>
                ) : filteredLeads.length === 0 ? (
                  <p className="px-3 py-2 text-[12px] text-[#555]">No leads found</p>
                ) : (
                  filteredLeads.map(l => (
                    <button
                      key={l.id}
                      type="button"
                      onClick={() => { setPickedLead(l); setSearch('') }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-[#2A2A2A]"
                    >
                      <span
                        className="h-2 w-2 flex-shrink-0 rounded-full"
                        style={{ backgroundColor: STATUS_COLOR[l.status] }}
                      />
                      <span className="flex-1 truncate text-[13px] text-white">{l.cafe_name}</span>
                      <span
                        className="flex-shrink-0 rounded px-1.5 py-0.5 text-[10px]"
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
            placeholder="Add notes…"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            className={`${inputClass} resize-none`}
          />
        </div>

        {error && <p className="mb-3 text-[13px] text-red-400">{error}</p>}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={!pickedLead || !date || submitting}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#D97706] py-2.5 text-sm font-semibold text-white hover:bg-[#B45309] disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
        >
          {submitting && <Loader2 size={16} className="animate-spin" />}
          {submitting ? 'Scheduling…' : 'Schedule Visit'}
        </button>
      </div>
    </div>
  )
}

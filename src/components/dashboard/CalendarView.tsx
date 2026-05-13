'use client'

import { useCallback, useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import NewScheduleModal from './NewScheduleModal'
import CheckInModal from './CheckInModal'
import {
  addMonths,
  subMonths,
  format,
  startOfMonth,
  getDay,
  getDaysInMonth,
  isSameDay,
  isToday,
} from 'date-fns'
import type { Lead, LeadStatus, Profile } from '@/types'
import LeadDetailsDrawer from './LeadDetailsDrawer'

const STATUS_COLOR: Record<LeadStatus, string> = {
  cold_lead:      '#0A84FF',
  hot_lead:       '#FF9F0A',
  demo_scheduled: '#D97706',
  customer:       '#30D158',
  competitor:     '#FF453A',
}

const STATUS_LABEL: Record<LeadStatus, string> = {
  cold_lead:      'Cold Lead',
  hot_lead:       'Hot Lead',
  demo_scheduled: 'Demo',
  customer:       'Customer',
  competitor:     'Competitor',
}

const SCHEDULED_TYPE_LABEL: Record<string, string> = {
  visit:    'Visit',
  demo:     'Demo',
  workshop: 'Workshop',
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

interface Props {
  profile: Profile
}

export default function CalendarView({ profile }: Props) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [localLeads, setLocalLeads] = useState<Lead[]>([])
  const [drawerLead, setDrawerLead] = useState<Lead | null>(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [isNewScheduleOpen, setIsNewScheduleOpen] = useState(false)
  const [checkInLead, setCheckInLead] = useState<Lead | null>(null)

  const fetchScheduled = useCallback(async () => {
    try {
      const res = await fetch('/api/leads/scheduled')
      if (!res.ok) return
      const { leads } = await res.json() as { leads: Lead[] }
      setLocalLeads(leads ?? [])
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    void fetchScheduled()
  }, [fetchScheduled])

  const scheduledLeads = localLeads.filter(l => l.scheduled_date)

  function getLeadsForDay(date: Date): Lead[] {
    return scheduledLeads.filter(l =>
      isSameDay(new Date(l.scheduled_date!), date)
    )
  }

  const firstDayOfMonth = startOfMonth(currentMonth)
  const startDayOfWeek = getDay(firstDayOfMonth)
  const daysInMonth = getDaysInMonth(currentMonth)

  const cells: (number | null)[] = [
    ...Array<null>(startDayOfWeek).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  while (cells.length % 7 !== 0) cells.push(null)

  const selectedDayLeads = getLeadsForDay(selectedDate)

  function handleLeadUpdate(updated: Lead) {
    setLocalLeads(prev => prev.map(l => (l.id === updated.id ? updated : l)))
    setDrawerLead(updated)
  }

  function handleLeadDelete(leadId: string) {
    setLocalLeads(prev => prev.filter(l => l.id !== leadId))
    setDrawerLead(null)
    setIsDrawerOpen(false)
  }

  function handleCheckInSuccess(updated: Lead) {
    setLocalLeads(prev => prev.map(l => (l.id === updated.id ? updated : l)))
    setCheckInLead(null)
  }

  return (
    <div style={{ background: 'var(--bg-page)', paddingBottom: '100px' }}>
      {/* Month header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px' }}>
        <button
          type="button"
          onClick={() => setCurrentMonth(m => subMonths(m, 1))}
          className="flex h-9 w-9 items-center justify-center rounded-xl transition-all active:scale-[0.92]"
          style={{ background: 'rgba(118,118,128,0.2)', border: 'none', color: 'rgba(235,235,245,0.6)', cursor: 'pointer' }}
        >
          <ChevronLeft size={18} />
        </button>
        <span style={{ fontSize: '17px', fontWeight: 600, color: 'var(--label-primary)' }}>
          {format(currentMonth, 'MMMM yyyy')}
        </span>
        <button
          type="button"
          onClick={() => setCurrentMonth(m => addMonths(m, 1))}
          className="flex h-9 w-9 items-center justify-center rounded-xl transition-all active:scale-[0.92]"
          style={{ background: 'rgba(118,118,128,0.2)', border: 'none', color: 'rgba(235,235,245,0.6)', cursor: 'pointer' }}
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 px-3 pb-1">
        {DAYS.map(d => (
          <div key={d} style={{ padding: '6px 0', textAlign: 'center', fontSize: '12px', fontWeight: 500, color: 'var(--label-tertiary)' }}>
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 px-3">
        {cells.map((day, idx) => {
          if (day === null) {
            return <div key={`empty-${idx}`} className="min-h-[44px]" />
          }

          const date = new Date(
            currentMonth.getFullYear(),
            currentMonth.getMonth(),
            day
          )
          const dayLeads = getLeadsForDay(date)
          const todayCell = isToday(date)
          const isSelected = isSameDay(date, selectedDate)

          return (
            <button
              key={day}
              type="button"
              onClick={() => setSelectedDate(date)}
              className="relative flex min-h-[44px] flex-col items-center justify-start rounded-xl pt-2 pb-1 transition-all active:scale-[0.92]"
              style={{
                background: isSelected
                  ? 'rgba(217,119,6,0.15)'
                  : todayCell
                  ? 'rgba(255,255,255,0.07)'
                  : 'transparent',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              <span
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  fontSize: '14px',
                  fontWeight: 500,
                  background: todayCell ? '#D97706' : 'transparent',
                  color: todayCell ? 'var(--label-primary)' : isSelected ? '#D97706' : 'var(--label-secondary)',
                }}
              >
                {day}
              </span>
              {dayLeads.length > 0 && (
                <div style={{ marginTop: '4px', display: 'flex', gap: '2px' }}>
                  {dayLeads.slice(0, 3).map((l, i) => (
                    <span
                      key={i}
                      style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        background: STATUS_COLOR[l.status],
                      }}
                    />
                  ))}
                </div>
              )}
            </button>
          )
        })}
      </div>

      {/* Selected day schedule list */}
      <div style={{ marginTop: '20px', padding: '0 16px' }}>
        <p style={{ marginBottom: '12px', fontSize: '13px', fontWeight: 500, color: 'var(--label-tertiary)' }}>
          {format(selectedDate, 'EEEE, MMMM d')}
          {' · '}
          <span style={{ color: 'var(--label-quaternary)' }}>
            {selectedDayLeads.length} scheduled
          </span>
        </p>

        {selectedDayLeads.length === 0 ? (
          <p style={{ padding: '32px 0', textAlign: 'center', fontSize: '14px', color: 'var(--label-quaternary)' }}>
            No visits scheduled
          </p>
        ) : (
          <div style={{ background: 'var(--bg-card)', borderRadius: '16px', overflow: 'hidden' }}>
            {selectedDayLeads.map((lead, index) => (
              <div key={lead.id}>
                {index > 0 && (
                  <div style={{ height: '0.5px', background: 'var(--separator)', margin: '0 16px' }} />
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px' }}>
                  <span
                    style={{
                      marginTop: '2px',
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      flexShrink: 0,
                      background: STATUS_COLOR[lead.status],
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setDrawerLead(lead)
                      setIsDrawerOpen(true)
                    }}
                    style={{ minWidth: 0, flex: 1, textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                  >
                    <p style={{ fontSize: '15px', fontWeight: 600, color: 'var(--label-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {lead.cafe_name}
                    </p>
                    <p style={{ marginTop: '2px', fontSize: '12px', color: 'var(--label-tertiary)' }}>
                      {lead.scheduled_date &&
                        format(new Date(lead.scheduled_date), 'h:mm a')}
                      {lead.scheduled_type &&
                        ` · ${SCHEDULED_TYPE_LABEL[lead.scheduled_type] ?? lead.scheduled_type}`}
                    </p>
                  </button>
                  <span
                    style={{
                      flexShrink: 0,
                      borderRadius: '6px',
                      padding: '2px 8px',
                      fontSize: '11px',
                      fontWeight: 600,
                      background: `${STATUS_COLOR[lead.status]}20`,
                      color: STATUS_COLOR[lead.status],
                    }}
                  >
                    {STATUS_LABEL[lead.status]}
                  </span>
                  <button
                    type="button"
                    onClick={() => setCheckInLead(lead)}
                    className="transition-all active:scale-[0.94]"
                    style={{
                      flexShrink: 0,
                      background: '#D97706',
                      borderRadius: '8px',
                      padding: '6px 12px',
                      fontSize: '13px',
                      fontWeight: 600,
                      color: '#FFF',
                      border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    Check In
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <LeadDetailsDrawer
        lead={drawerLead}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onUpdate={handleLeadUpdate}
        onDelete={handleLeadDelete}
      />

      {/* Floating add schedule button */}
      <button
        type="button"
        onClick={() => setIsNewScheduleOpen(true)}
        className="fixed right-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#D97706] shadow-lg transition-all active:scale-[0.92] hover:bg-[#B45309]"
        style={{ bottom: '106px' }}
        aria-label="Schedule visit"
      >
        <Plus size={22} className="text-white" />
      </button>

      <NewScheduleModal
        isOpen={isNewScheduleOpen}
        onClose={() => setIsNewScheduleOpen(false)}
        selectedDate={selectedDate}
        onScheduled={() => {
          setIsNewScheduleOpen(false)
          void fetchScheduled()
        }}
      />

      {checkInLead && (
        <CheckInModal
          lead={checkInLead}
          isOpen={!!checkInLead}
          onClose={() => setCheckInLead(null)}
          onCheckedIn={handleCheckInSuccess}
          profile={profile}
        />
      )}
    </div>
  )
}

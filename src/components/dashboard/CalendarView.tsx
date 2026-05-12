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
    <div className="bg-black pb-[108px]">
      {/* Month header */}
      <div className="flex items-center justify-between px-4 py-4">
        <button
          type="button"
          onClick={() => setCurrentMonth(m => subMonths(m, 1))}
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.07] text-[#8E8E93] transition-all active:scale-[0.92] hover:text-white"
        >
          <ChevronLeft size={18} />
        </button>
        <span className="text-[17px] font-semibold text-white">
          {format(currentMonth, 'MMMM yyyy')}
        </span>
        <button
          type="button"
          onClick={() => setCurrentMonth(m => addMonths(m, 1))}
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.07] text-[#8E8E93] transition-all active:scale-[0.92] hover:text-white"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 px-3 pb-1">
        {DAYS.map(d => (
          <div key={d} className="py-1.5 text-center text-[12px] font-medium text-[#636366]">
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
              className={`relative flex min-h-[44px] flex-col items-center justify-start rounded-xl pt-2 pb-1 transition-all active:scale-[0.92] ${
                isSelected
                  ? 'bg-[#D97706]/15'
                  : todayCell
                  ? 'bg-white/[0.07]'
                  : 'hover:bg-white/[0.04]'
              }`}
            >
              <span
                className={`flex h-7 w-7 items-center justify-center rounded-full text-[14px] font-medium ${
                  todayCell
                    ? 'bg-[#D97706] text-white'
                    : isSelected
                    ? 'text-[#D97706]'
                    : 'text-[#8E8E93]'
                }`}
              >
                {day}
              </span>
              {dayLeads.length > 0 && (
                <div className="mt-1 flex gap-0.5">
                  {dayLeads.slice(0, 3).map((l, i) => (
                    <span
                      key={i}
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ backgroundColor: STATUS_COLOR[l.status] }}
                    />
                  ))}
                </div>
              )}
            </button>
          )
        })}
      </div>

      {/* Selected day schedule list */}
      <div className="mt-5 px-4">
        <p className="mb-3 text-[13px] font-medium text-[#8E8E93]">
          {format(selectedDate, 'EEEE, MMMM d')}
          {' · '}
          <span className="text-[#636366]">
            {selectedDayLeads.length} scheduled
          </span>
        </p>

        {selectedDayLeads.length === 0 ? (
          <p className="py-8 text-center text-[14px] text-[#48484A]">
            No visits scheduled
          </p>
        ) : (
          <div className="flex flex-col gap-2.5">
            {selectedDayLeads.map(lead => (
              <div
                key={lead.id}
                className="flex items-center gap-3 rounded-2xl border border-white/[0.06] bg-[#1C1C1E] px-4 py-3.5"
              >
                <span
                  className="mt-0.5 h-2 w-2 flex-shrink-0 rounded-full"
                  style={{ backgroundColor: STATUS_COLOR[lead.status] }}
                />
                <button
                  type="button"
                  onClick={() => {
                    setDrawerLead(lead)
                    setIsDrawerOpen(true)
                  }}
                  className="min-w-0 flex-1 text-left"
                >
                  <p className="truncate text-[15px] font-semibold text-white">
                    {lead.cafe_name}
                  </p>
                  <p className="mt-0.5 text-[12px] text-[#8E8E93]">
                    {lead.scheduled_date &&
                      format(new Date(lead.scheduled_date), 'h:mm a')}
                    {lead.scheduled_type &&
                      ` · ${SCHEDULED_TYPE_LABEL[lead.scheduled_type] ?? lead.scheduled_type}`}
                  </p>
                </button>
                <span
                  className="flex-shrink-0 rounded-lg px-1.5 py-0.5 text-[11px] font-semibold"
                  style={{
                    backgroundColor: `${STATUS_COLOR[lead.status]}20`,
                    color: STATUS_COLOR[lead.status],
                  }}
                >
                  {STATUS_LABEL[lead.status]}
                </span>
                <button
                  type="button"
                  onClick={() => setCheckInLead(lead)}
                  className="flex-shrink-0 rounded-lg bg-[#D97706] px-3 py-1.5 text-[12px] font-semibold text-white transition-all active:scale-[0.94] hover:bg-[#B45309]"
                >
                  Check In
                </button>
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
        className="fixed bottom-[88px] right-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#D97706] shadow-lg transition-all active:scale-[0.92] hover:bg-[#B45309]"
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

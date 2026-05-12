'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { useRouter } from 'next/navigation'
import NewScheduleModal from './NewScheduleModal'
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
import type { Lead, LeadStatus } from '@/types'
import LeadDetailsDrawer from './LeadDetailsDrawer'

const STATUS_COLOR: Record<LeadStatus, string> = {
  cold_lead:      '#3B82F6',
  hot_lead:       '#F97316',
  demo_scheduled: '#D97706',
  customer:       '#22C55E',
  competitor:     '#EF4444',
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
  leads: Lead[]
}

export default function CalendarView({ leads: initialLeads }: Props) {
  const router = useRouter()
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [localLeads, setLocalLeads] = useState(initialLeads)
  const [drawerLead, setDrawerLead] = useState<Lead | null>(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [isNewScheduleOpen, setIsNewScheduleOpen] = useState(false)

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

  const selectedDayLeads = selectedDate ? getLeadsForDay(selectedDate) : []

  function handleLeadUpdate(updated: Lead) {
    setLocalLeads(prev => prev.map(l => (l.id === updated.id ? updated : l)))
    setDrawerLead(updated)
  }

  function handleLeadDelete(leadId: string) {
    setLocalLeads(prev => prev.filter(l => l.id !== leadId))
    setDrawerLead(null)
    setIsDrawerOpen(false)
  }

  return (
    <div className="bg-[#0A0A0A] pb-24">
      {/* Month header */}
      <div className="flex items-center justify-between px-4 py-3.5">
        <button
          type="button"
          onClick={() => setCurrentMonth(m => subMonths(m, 1))}
          className="rounded-lg border border-[#2A2A2A] p-2 text-[#A0A0A0] hover:text-white transition-colors"
        >
          <ChevronLeft size={16} />
        </button>
        <span className="text-[16px] font-semibold text-white">
          {format(currentMonth, 'MMMM yyyy')}
        </span>
        <button
          type="button"
          onClick={() => setCurrentMonth(m => addMonths(m, 1))}
          className="rounded-lg border border-[#2A2A2A] p-2 text-[#A0A0A0] hover:text-white transition-colors"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 px-2 pb-1">
        {DAYS.map(d => (
          <div key={d} className="py-1.5 text-center text-[11px] font-medium text-[#555]">
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 px-2">
        {cells.map((day, idx) => {
          if (day === null) {
            return <div key={`empty-${idx}`} className="aspect-square" />
          }

          const date = new Date(
            currentMonth.getFullYear(),
            currentMonth.getMonth(),
            day
          )
          const dayLeads = getLeadsForDay(date)
          const todayCell = isToday(date)
          const isSelected = selectedDate ? isSameDay(date, selectedDate) : false

          return (
            <button
              key={day}
              type="button"
              onClick={() => setSelectedDate(isSelected ? null : date)}
              className={`relative flex flex-col items-center rounded-lg py-1.5 transition-colors ${
                isSelected
                  ? 'bg-[#D97706]/20'
                  : todayCell
                  ? 'bg-[#2A2A2A]'
                  : 'hover:bg-[#1A1A1A]'
              }`}
            >
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full text-[13px] font-medium ${
                  todayCell
                    ? 'bg-[#D97706] text-white'
                    : isSelected
                    ? 'text-[#D97706]'
                    : 'text-[#A0A0A0]'
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
      {selectedDate && (
        <div className="mt-4 px-4">
          <p className="mb-3 text-[12px] font-medium text-[#7A7A7A]">
            {format(selectedDate, 'EEEE, MMMM d')}
            {' · '}
            <span className="text-[#A0A0A0]">
              {selectedDayLeads.length} scheduled
            </span>
          </p>

          {selectedDayLeads.length === 0 ? (
            <p className="py-6 text-center text-[13px] text-[#444]">
              No visits scheduled
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {selectedDayLeads.map(lead => (
                <button
                  key={lead.id}
                  type="button"
                  onClick={() => {
                    setDrawerLead(lead)
                    setIsDrawerOpen(true)
                  }}
                  className="flex items-center gap-3 rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] px-3.5 py-3 text-left transition-colors hover:border-[#3A3A3A]"
                >
                  <span
                    className="mt-0.5 h-2 w-2 flex-shrink-0 rounded-full"
                    style={{ backgroundColor: STATUS_COLOR[lead.status] }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold text-white">
                      {lead.cafe_name}
                    </p>
                    <p className="mt-0.5 text-[11px] text-[#7A7A7A]">
                      {lead.scheduled_date &&
                        format(new Date(lead.scheduled_date), 'h:mm a')}
                      {lead.scheduled_type &&
                        ` · ${SCHEDULED_TYPE_LABEL[lead.scheduled_type] ?? lead.scheduled_type}`}
                    </p>
                  </div>
                  <span
                    className="flex-shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-medium"
                    style={{
                      backgroundColor: `${STATUS_COLOR[lead.status]}20`,
                      color: STATUS_COLOR[lead.status],
                    }}
                  >
                    {STATUS_LABEL[lead.status]}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

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
        className="fixed bottom-24 right-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#D97706] shadow-lg hover:bg-[#B45309] transition-colors"
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
          router.refresh()
        }}
      />
    </div>
  )
}

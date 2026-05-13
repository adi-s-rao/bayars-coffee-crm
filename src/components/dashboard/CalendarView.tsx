'use client'

import { useCallback, useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, CheckCircle, Plus } from 'lucide-react'
import dynamic from 'next/dynamic'
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
import type { Lead, Profile, ScheduledVisit, VisitType } from '@/types'
import { toast } from 'sonner'

const NewScheduleModal = dynamic(() => import('./NewScheduleModal'), { ssr: false })
const CheckInModal = dynamic(() => import('./CheckInModal'), { ssr: false })
const LeadDetailsDrawer = dynamic(() => import('./LeadDetailsDrawer'), { ssr: false })

const VISIT_COLOR: Record<VisitType, string> = {
  visit:    '#0A84FF',
  demo:     '#FF9F0A',
  workshop: '#BF5AF2',
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

interface Props {
  profile: Profile
}

export default function CalendarView({ profile }: Props) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [visits, setVisits] = useState<ScheduledVisit[]>([])
  const [drawerLead, setDrawerLead] = useState<Lead | null>(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [isNewScheduleOpen, setIsNewScheduleOpen] = useState(false)
  const [checkInVisit, setCheckInVisit] = useState<ScheduledVisit | null>(null)

  const isManager = profile.role === 'manager'

  const fetchVisits = useCallback(async () => {
    try {
      const res = await fetch('/api/scheduled-visits')
      if (!res.ok) return
      const { visits: data } = await res.json() as { visits: ScheduledVisit[] }
      setVisits(data ?? [])
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    void fetchVisits()
  }, [fetchVisits])

  function getVisitsForDay(date: Date): ScheduledVisit[] {
    return visits.filter(v => isSameDay(new Date(v.scheduled_date), date))
  }

  const firstDayOfMonth = startOfMonth(currentMonth)
  const startDayOfWeek = getDay(firstDayOfMonth)
  const daysInMonth = getDaysInMonth(currentMonth)

  const cells: (number | null)[] = [
    ...Array<null>(startDayOfWeek).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  while (cells.length % 7 !== 0) cells.push(null)

  const selectedDayVisits = getVisitsForDay(selectedDate)

  async function handleMarkComplete(visit: ScheduledVisit) {
    try {
      const res = await fetch(`/api/scheduled-visits/${visit.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: true }),
      })
      if (!res.ok) throw new Error('Failed')
      setVisits(prev => prev.map(v => v.id === visit.id ? { ...v, completed: true } : v))
      toast.success('Marked as complete')
    } catch {
      toast.error('Failed to mark complete')
    }
  }

  // For check-in: load the actual lead when opening CheckInModal
  const [checkInLead, setCheckInLead] = useState<Lead | null>(null)

  async function handleOpenCheckIn(visit: ScheduledVisit) {
    setCheckInVisit(visit)
    try {
      const res = await fetch(`/api/leads/${visit.lead_id}`)
      if (!res.ok) return
      const { lead } = await res.json() as { lead: Lead }
      setCheckInLead(lead)
    } catch { /* ignore */ }
  }

  function handleCheckInSuccess(updated: Lead) {
    setCheckInLead(null)
    setCheckInVisit(null)
    // Optionally mark as complete after check-in
    if (checkInVisit) {
      void handleMarkComplete(checkInVisit)
    }
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
          if (day === null) return <div key={`empty-${idx}`} className="min-h-[44px]" />

          const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)
          const dayVisits = getVisitsForDay(date)
          const todayCell = isToday(date)
          const isSelected = isSameDay(date, selectedDate)

          return (
            <button
              key={day}
              type="button"
              onClick={() => setSelectedDate(date)}
              className="relative flex min-h-[44px] flex-col items-center justify-start rounded-xl pt-2 pb-1 transition-all active:scale-[0.92]"
              style={{ background: isSelected ? 'rgba(217,119,6,0.15)' : todayCell ? 'rgba(255,255,255,0.07)' : 'transparent', border: 'none', cursor: 'pointer' }}
            >
              <span
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: '28px', height: '28px', borderRadius: '50%', fontSize: '14px', fontWeight: 500,
                  background: todayCell ? '#D97706' : 'transparent',
                  color: todayCell ? '#FFF' : isSelected ? '#D97706' : 'var(--label-secondary)',
                }}
              >
                {day}
              </span>
              {dayVisits.length > 0 && (
                <div style={{ marginTop: '4px', display: 'flex', gap: '2px' }}>
                  {dayVisits.slice(0, 3).map((v, i) => (
                    <span
                      key={i}
                      style={{ width: '6px', height: '6px', borderRadius: '50%', background: v.completed ? '#30D158' : VISIT_COLOR[v.visit_type] }}
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
            {selectedDayVisits.length} scheduled
          </span>
        </p>

        {selectedDayVisits.length === 0 ? (
          <p style={{ padding: '32px 0', textAlign: 'center', fontSize: '14px', color: 'var(--label-quaternary)' }}>
            No visits scheduled
          </p>
        ) : (
          <div style={{ background: 'var(--bg-card)', borderRadius: '16px', overflow: 'hidden' }}>
            {selectedDayVisits.map((visit, index) => (
              <div key={visit.id}>
                {index > 0 && <div style={{ height: '0.5px', background: 'var(--separator)', margin: '0 16px' }} />}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px' }}>
                  <span
                    style={{ width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0, background: visit.completed ? '#30D158' : VISIT_COLOR[visit.visit_type] }}
                  />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <p style={{ fontSize: '15px', fontWeight: 600, color: visit.completed ? 'var(--label-tertiary)' : 'var(--label-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textDecoration: visit.completed ? 'line-through' : 'none' }}>
                      {visit.leads?.cafe_name ?? 'Unknown'}
                    </p>
                    <p style={{ marginTop: '2px', fontSize: '12px', color: 'var(--label-tertiary)' }}>
                      <span style={{ textTransform: 'capitalize' }}>{visit.visit_type}</span>
                      {visit.profiles?.full_name && ` · ${visit.profiles.full_name}`}
                    </p>
                  </div>

                  {!visit.completed && (
                    <>
                      <button
                        type="button"
                        onClick={() => void handleOpenCheckIn(visit)}
                        className="transition-all active:scale-[0.94]"
                        style={{ flexShrink: 0, background: '#D97706', borderRadius: '8px', padding: '6px 12px', fontSize: '13px', fontWeight: 600, color: '#FFF', border: 'none', cursor: 'pointer' }}
                      >
                        Check In
                      </button>
                      {isManager && (
                        <button
                          type="button"
                          onClick={() => void handleMarkComplete(visit)}
                          title="Mark complete"
                          style={{ flexShrink: 0, background: 'rgba(48,209,88,0.12)', border: '0.5px solid rgba(48,209,88,0.3)', borderRadius: '8px', padding: '6px 8px', cursor: 'pointer' }}
                        >
                          <CheckCircle size={14} style={{ color: '#30D158' }} />
                        </button>
                      )}
                    </>
                  )}
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
        onUpdate={updated => setDrawerLead(updated)}
        onDelete={() => { setDrawerLead(null); setIsDrawerOpen(false) }}
      />

      {/* FAB — manager only */}
      {isManager && (
        <button
          type="button"
          onClick={() => setIsNewScheduleOpen(true)}
          className="fixed right-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#D97706] shadow-lg transition-all active:scale-[0.92] hover:bg-[#B45309]"
          style={{ bottom: '106px' }}
          aria-label="Schedule visit"
        >
          <Plus size={22} className="text-white" />
        </button>
      )}

      <NewScheduleModal
        isOpen={isNewScheduleOpen}
        onClose={() => setIsNewScheduleOpen(false)}
        selectedDate={selectedDate}
        onScheduled={() => {
          setIsNewScheduleOpen(false)
          void fetchVisits()
        }}
        profile={profile}
      />

      {checkInLead && checkInVisit && (
        <CheckInModal
          lead={checkInLead}
          isOpen={!!checkInLead}
          onClose={() => { setCheckInLead(null); setCheckInVisit(null) }}
          onCheckedIn={handleCheckInSuccess}
          profile={profile}
        />
      )}
    </div>
  )
}

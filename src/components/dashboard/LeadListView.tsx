'use client'

import { useCallback, useEffect, useState } from 'react'
import { Coffee, Phone, Plus, Search, User } from 'lucide-react'
import { formatDistanceToNow, isToday, parseISO } from 'date-fns'
import { toast } from 'sonner'
import useSWR from 'swr'
import type { Lead, LeadStatus, Profile } from '@/types'
import CheckInModal from './CheckInModal'
import LeadDetailsDrawer from './LeadDetailsDrawer'
import NewLeadModal from './NewLeadModal'
import ScheduleModal from './ScheduleModal'

interface Props {
  profile: Profile
}

const STATUS_META: Record<LeadStatus, { label: string; color: string; bg: string; dot: string }> = {
  cold_lead:      { label: 'Cold Lead',  color: '#0A84FF', bg: 'rgba(10,132,255,0.15)',  dot: '#0A84FF' },
  hot_lead:       { label: 'Hot Lead',   color: '#FF9F0A', bg: 'rgba(255,159,10,0.15)',  dot: '#FF9F0A' },
  demo_scheduled: { label: 'Demo',       color: '#D97706', bg: 'rgba(217,119,6,0.15)',   dot: '#D97706' },
  customer:       { label: 'Customer',   color: '#30D158', bg: 'rgba(48,209,88,0.15)',   dot: '#30D158' },
  competitor:     { label: 'Competitor', color: '#FF453A', bg: 'rgba(255,69,58,0.15)',   dot: '#FF453A' },
}

const FILTER_PILLS: { label: string; value: LeadStatus | 'all' }[] = [
  { label: 'All',        value: 'all' },
  { label: 'Cold Lead',  value: 'cold_lead' },
  { label: 'Hot Lead',   value: 'hot_lead' },
  { label: 'Demo',       value: 'demo_scheduled' },
  { label: 'Customer',   value: 'customer' },
  { label: 'Competitor', value: 'competitor' },
]

function lastVisitLabel(updatedAt: string): string {
  const d = parseISO(updatedAt)
  if (isToday(d)) return 'Updated today'
  return `Updated ${formatDistanceToNow(d, { addSuffix: true })}`
}

const fetcher = (url: string) => fetch(url).then(r => r.json())

export default function LeadListView({ profile }: Props) {
  const { data, isLoading, mutate } = useSWR<{ leads: Lead[] }>(
    '/api/leads',
    fetcher,
    { refreshInterval: 0, revalidateOnFocus: false }
  )
  const leads = data?.leads ?? []

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<LeadStatus | 'all'>('all')
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [isCheckInOpen, setIsCheckInOpen] = useState(false)
  const [isNewLeadOpen, setIsNewLeadOpen] = useState(false)
  const [isScheduleOpen, setIsScheduleOpen] = useState(false)
  const [checkInCount, setCheckInCount] = useState(0)
  const [totalKm, setTotalKm] = useState(0)
  const [checkinRefreshKey, setCheckinRefreshKey] = useState(0)

  const fetchTodayStats = useCallback(async () => {
    try {
      const res = await fetch('/api/checkins/today')
      const d = await res.json() as { checkInCount?: number; totalKm?: number }
      setCheckInCount(d?.checkInCount ?? 0)
      setTotalKm(d?.totalKm ?? 0)
    } catch {
      setCheckInCount(0)
      setTotalKm(0)
    }
  }, [])

  useEffect(() => { void fetchTodayStats() }, [fetchTodayStats])

  useEffect(() => {
    const refresh = () => { void fetchTodayStats() }
    window.addEventListener('checkin-completed', refresh)
    return () => window.removeEventListener('checkin-completed', refresh)
  }, [fetchTodayStats])

  useEffect(() => {
    const refresh = () => { void mutate() }
    window.addEventListener('lead-created', refresh)
    return () => window.removeEventListener('lead-created', refresh)
  }, [mutate])

  const leadsToday = leads.filter(l => isToday(parseISO(l.created_at))).length

  const filtered = leads.filter(l => {
    const matchSearch = l.cafe_name.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'all' || l.status === statusFilter
    return matchSearch && matchStatus
  })

  function openDrawer(lead: Lead) {
    setSelectedLead(lead)
    setIsDrawerOpen(true)
  }

  function openCheckIn(lead: Lead) {
    setSelectedLead(lead)
    setIsCheckInOpen(true)
  }

  function openSchedule(lead: Lead) {
    setSelectedLead(lead)
    setIsScheduleOpen(true)
  }

  function handleLeadUpdate(updated: Lead) {
    setSelectedLead(updated)
    void mutate(
      d => d ? { leads: d.leads.map(l => l.id === updated.id ? updated : l) } : d,
      { revalidate: false }
    )
  }

  function handleLeadScheduled(updated: Lead) {
    handleLeadUpdate(updated)
  }

  function handleCheckInSuccess(updated: Lead) {
    handleLeadUpdate(updated)
    setCheckinRefreshKey(k => k + 1)
  }

  function handleLeadDelete(leadId: string) {
    setIsDrawerOpen(false)
    setSelectedLead(null)
    void mutate(
      d => d ? { leads: d.leads.filter(l => l.id !== leadId) } : d,
      { revalidate: false }
    )
  }

  function handleLeadCreated(newLead: Lead) {
    setIsNewLeadOpen(false)
    toast.success('Lead added!')
    void mutate(
      d => d ? { leads: [newLead, ...d.leads] } : { leads: [newLead] },
      { revalidate: false }
    )
  }

  return (
    <div className="bg-black pb-[108px]">
      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3 px-4 py-4">
        {[
          { value: String(leadsToday),  label: 'Leads Today' },
          { value: String(checkInCount), label: 'Check-ins' },
          { value: totalKm.toFixed(1),  label: 'KM Today' },
        ].map(({ value, label }) => (
          <div
            key={label}
            className="rounded-2xl bg-[#1C1C1E] p-3.5"
          >
            <p className="text-[28px] font-bold leading-none tracking-tight text-[#D97706]">
              {value}
            </p>
            <p className="mt-1.5 text-[12px] font-medium text-[#8E8E93]">{label}</p>
          </div>
        ))}
      </div>

      {/* Search bar */}
      <div className="relative px-4 pb-3">
        <Search
          size={15}
          className="pointer-events-none absolute left-7 top-1/2 -translate-y-1/2 text-[#636366]"
        />
        <input
          type="text"
          placeholder="Search cafes…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full rounded-xl bg-[#1C1C1E] py-3 pl-8 pr-3 text-[15px] text-white outline-none placeholder:text-[#636366] transition-colors"
        />
      </div>

      {/* Filter pills */}
      <div className="flex gap-2 overflow-x-auto px-4 pb-3 [&::-webkit-scrollbar]:hidden">
        {FILTER_PILLS.map(({ label, value }) => (
          <button
            key={value}
            type="button"
            onClick={() => setStatusFilter(value)}
            className={`flex-shrink-0 rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-all active:scale-[0.94] ${
              statusFilter === value
                ? 'bg-[#D97706] text-white'
                : 'bg-[#1C1C1E] text-[#8E8E93] hover:text-white'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Lead cards */}
      <div className="flex flex-col gap-3 px-4">
        {isLoading ? (
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map(i => (
              <div
                key={i}
                className="h-[120px] animate-pulse rounded-2xl bg-[#1C1C1E]"
              />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <Coffee size={40} className="text-[#2C2C2E]" />
            <p className="mt-3 text-[15px] font-medium text-[#636366]">No leads found</p>
            <p className="mt-1 text-[13px] text-[#48484A]">Add your first lead to get started</p>
          </div>
        ) : (
          filtered.map(lead => {
            const meta = STATUS_META[lead.status]
            return (
              <div
                key={lead.id}
                className="rounded-2xl border border-white/[0.06] bg-[#1C1C1E] p-4"
              >
                {/* Top row */}
                <div
                  className="flex cursor-pointer items-start gap-2.5"
                  onClick={() => openDrawer(lead)}
                >
                  <span
                    className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full"
                    style={{ backgroundColor: meta.dot }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-[17px] font-semibold leading-tight text-white">
                      {lead.cafe_name}
                    </p>
                    {lead.location_address && (
                      <p className="mt-0.5 overflow-hidden text-[13px] text-[#8E8E93]"
                         style={{ textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {lead.location_address}
                      </p>
                    )}
                  </div>
                  <span
                    className="flex-shrink-0 rounded-lg px-2 py-0.5 text-[11px] font-semibold"
                    style={{ backgroundColor: meta.bg, color: meta.color }}
                  >
                    {meta.label}
                  </span>
                </div>

                {/* Middle row */}
                <div
                  className="my-2.5 flex cursor-pointer items-center gap-2 text-[13px] text-[#8E8E93]"
                  onClick={() => openDrawer(lead)}
                >
                  <User size={13} className="text-[#636366]" />
                  <span>{lead.poc_name || '—'}</span>
                  <span className="text-[#3A3A3C]">•</span>
                  <Phone size={13} className="text-[#636366]" />
                  <span>{lead.poc_contact || '—'}</span>
                </div>

                {/* Bottom row */}
                <div className="flex items-center justify-between border-t border-white/[0.06] pt-2.5">
                  <span className="rounded-lg bg-black/40 px-2 py-1 text-[11px] text-[#636366]">
                    {lastVisitLabel(lead.updated_at)}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => openCheckIn(lead)}
                      className="rounded-lg bg-[#D97706] px-3 py-1.5 text-[12px] font-semibold text-white transition-all active:scale-[0.94] hover:bg-[#B45309]"
                    >
                      Check In
                    </button>
                    <button
                      type="button"
                      onClick={() => openSchedule(lead)}
                      className="rounded-lg border border-white/[0.08] px-3 py-1.5 text-[12px] font-medium text-[#8E8E93] transition-all hover:text-white"
                    >
                      Schedule
                    </button>
                    <button
                      type="button"
                      onClick={() => openDrawer(lead)}
                      className="rounded-lg px-2.5 py-1.5 text-[12px] font-medium text-[#636366] transition-all hover:text-white"
                    >
                      Edit
                    </button>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Floating new lead button */}
      <button
        type="button"
        onClick={() => setIsNewLeadOpen(true)}
        className="fixed bottom-[88px] right-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#D97706] shadow-lg transition-all active:scale-[0.92] hover:bg-[#B45309]"
        aria-label="New lead"
      >
        <Plus size={22} className="text-white" />
      </button>

      {/* Modals / Drawers */}
      <LeadDetailsDrawer
        lead={selectedLead}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onUpdate={handleLeadUpdate}
        onDelete={handleLeadDelete}
        refreshTrigger={checkinRefreshKey}
      />

      {selectedLead && (
        <CheckInModal
          lead={selectedLead}
          isOpen={isCheckInOpen}
          onClose={() => setIsCheckInOpen(false)}
          onCheckedIn={handleCheckInSuccess}
          profile={profile}
        />
      )}

      {selectedLead && (
        <ScheduleModal
          lead={selectedLead}
          isOpen={isScheduleOpen}
          onClose={() => setIsScheduleOpen(false)}
          onScheduled={handleLeadScheduled}
          profile={profile}
        />
      )}

      <NewLeadModal
        isOpen={isNewLeadOpen}
        onClose={() => setIsNewLeadOpen(false)}
        profile={profile}
        onCreated={handleLeadCreated}
      />
    </div>
  )
}

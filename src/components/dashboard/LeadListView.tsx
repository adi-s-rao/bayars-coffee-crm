'use client'

import { Fragment, useCallback, useEffect, useState } from 'react'
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
    <div style={{ background: '#000', paddingBottom: '100px' }}>
      {/* Stats row — horizontal scroll */}
      <div
        style={{ display: 'flex', gap: '10px', padding: '16px', overflowX: 'auto' }}
        className="[&::-webkit-scrollbar]:hidden"
      >
        {[
          { value: String(leadsToday),   label: 'Leads Today' },
          { value: String(checkInCount), label: 'Check-ins' },
          { value: totalKm.toFixed(1),   label: 'KM Today' },
        ].map(({ value, label }) => (
          <div
            key={label}
            style={{ minWidth: '110px', background: '#1C1C1E', borderRadius: '16px', padding: '14px', flexShrink: 0 }}
          >
            <p style={{ fontSize: '28px', fontWeight: 700, lineHeight: 1, letterSpacing: '-0.5px', color: '#D97706' }}>
              {value}
            </p>
            <p style={{ marginTop: '6px', fontSize: '12px', fontWeight: 500, color: 'rgba(235,235,245,0.45)' }}>{label}</p>
          </div>
        ))}
      </div>

      {/* Search bar */}
      <div style={{ position: 'relative', padding: '0 16px 10px' }}>
        <Search
          size={15}
          style={{
            position: 'absolute',
            left: '28px',
            top: '50%',
            transform: 'translateY(-55%)',
            color: 'rgba(235,235,245,0.35)',
            pointerEvents: 'none',
          }}
        />
        <input
          type="text"
          placeholder="Search cafes…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="placeholder:text-[rgba(235,235,245,0.35)]"
          style={{
            width: '100%',
            height: '36px',
            background: 'rgba(118,118,128,0.18)',
            borderRadius: '10px',
            border: 'none',
            outline: 'none',
            paddingLeft: '32px',
            paddingRight: '12px',
            fontSize: '17px',
            color: '#FFF',
            boxSizing: 'border-box',
          }}
        />
      </div>

      {/* Filter pills */}
      <div
        style={{ display: 'flex', gap: '8px', overflowX: 'auto', padding: '0 16px 12px' }}
        className="[&::-webkit-scrollbar]:hidden"
      >
        {FILTER_PILLS.map(({ label, value }) => (
          <button
            key={value}
            type="button"
            onClick={() => setStatusFilter(value)}
            className="transition-all active:scale-[0.95]"
            style={{
              flexShrink: 0,
              height: '32px',
              borderRadius: '8px',
              padding: '0 14px',
              fontSize: '15px',
              fontWeight: 500,
              border: 'none',
              cursor: 'pointer',
              background: statusFilter === value ? '#D97706' : 'rgba(118,118,128,0.2)',
              color: statusFilter === value ? '#FFF' : 'rgba(235,235,245,0.6)',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Lead list */}
      <div style={{ padding: '0 16px' }}>
        {isLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[1, 2, 3].map(i => (
              <div
                key={i}
                className="animate-pulse"
                style={{ height: '120px', borderRadius: '16px', background: '#1C1C1E' }}
              />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '64px 0', textAlign: 'center' }}>
            <Coffee size={40} style={{ color: '#2C2C2E' }} />
            <p style={{ marginTop: '12px', fontSize: '15px', fontWeight: 500, color: '#636366' }}>No leads found</p>
            <p style={{ marginTop: '4px', fontSize: '13px', color: '#48484A' }}>Add your first lead to get started</p>
          </div>
        ) : (
          <div style={{ background: '#1C1C1E', borderRadius: '16px', overflow: 'hidden' }}>
            {filtered.map((lead, index) => {
              const meta = STATUS_META[lead.status]
              return (
                <Fragment key={lead.id}>
                  {index > 0 && (
                    <div style={{ height: '0.5px', background: 'rgba(84,84,88,0.65)', margin: '0 16px' }} />
                  )}
                  <div style={{ padding: '14px 16px' }}>
                    {/* Top row */}
                    <div
                      style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer' }}
                      onClick={() => openDrawer(lead)}
                    >
                      <span
                        style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          background: meta.dot,
                          flexShrink: 0,
                          marginTop: '6px',
                        }}
                      />
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <p style={{ fontSize: '17px', fontWeight: 600, color: '#FFF', lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {lead.cafe_name}
                        </p>
                        {lead.location_address && (
                          <p style={{ marginTop: '2px', fontSize: '13px', color: 'rgba(235,235,245,0.45)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {lead.location_address}
                          </p>
                        )}
                      </div>
                      <span
                        style={{
                          flexShrink: 0,
                          borderRadius: '6px',
                          padding: '2px 8px',
                          fontSize: '11px',
                          fontWeight: 600,
                          background: meta.bg,
                          color: meta.color,
                        }}
                      >
                        {meta.label}
                      </span>
                    </div>

                    {/* Middle row */}
                    <div
                      style={{ margin: '8px 0', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
                      onClick={() => openDrawer(lead)}
                    >
                      <User size={13} style={{ color: 'rgba(235,235,245,0.35)', flexShrink: 0 }} />
                      <span style={{ fontSize: '13px', color: 'rgba(235,235,245,0.6)' }}>{lead.poc_name || '—'}</span>
                      <span style={{ color: 'rgba(84,84,88,0.9)' }}>·</span>
                      <Phone size={13} style={{ color: 'rgba(235,235,245,0.35)', flexShrink: 0 }} />
                      <span style={{ fontSize: '13px', color: 'rgba(235,235,245,0.6)' }}>{lead.poc_contact || '—'}</span>
                    </div>

                    {/* Bottom row */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '6px' }}>
                      <span style={{ fontSize: '13px', color: 'rgba(235,235,245,0.35)' }}>
                        {lastVisitLabel(lead.updated_at)}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <button
                          type="button"
                          onClick={() => openCheckIn(lead)}
                          className="transition-all active:scale-[0.95]"
                          style={{
                            background: '#D97706',
                            borderRadius: '8px',
                            padding: '7px 14px',
                            fontSize: '15px',
                            fontWeight: 600,
                            color: '#FFF',
                            border: 'none',
                            cursor: 'pointer',
                          }}
                        >
                          Check In
                        </button>
                        <button
                          type="button"
                          onClick={() => openSchedule(lead)}
                          className="transition-all active:scale-[0.95]"
                          style={{
                            background: 'rgba(118,118,128,0.2)',
                            borderRadius: '8px',
                            padding: '7px 14px',
                            fontSize: '15px',
                            fontWeight: 500,
                            color: 'rgba(235,235,245,0.7)',
                            border: 'none',
                            cursor: 'pointer',
                          }}
                        >
                          Schedule
                        </button>
                        <button
                          type="button"
                          onClick={() => openDrawer(lead)}
                          className="transition-all active:scale-[0.95]"
                          style={{
                            background: 'transparent',
                            borderRadius: '8px',
                            padding: '7px 10px',
                            fontSize: '15px',
                            fontWeight: 500,
                            color: '#D97706',
                            border: 'none',
                            cursor: 'pointer',
                          }}
                        >
                          Edit
                        </button>
                      </div>
                    </div>
                  </div>
                </Fragment>
              )
            })}
          </div>
        )}
      </div>

      {/* Floating new lead button */}
      <button
        type="button"
        onClick={() => setIsNewLeadOpen(true)}
        className="fixed right-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#D97706] shadow-lg transition-all active:scale-[0.92] hover:bg-[#B45309]"
        style={{ bottom: '106px' }}
        aria-label="New lead"
      >
        <Plus size={22} className="text-white" />
      </button>

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

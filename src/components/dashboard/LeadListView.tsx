'use client'

import { useState } from 'react'
import { Coffee, Phone, Plus, Search, User } from 'lucide-react'
import { formatDistanceToNow, isToday } from 'date-fns'
import { toast } from 'sonner'
import type { Lead, LeadStatus, Profile } from '@/types'
import LeadDetailsDrawer from './LeadDetailsDrawer'
import CheckInModal from './CheckInModal'
import NewLeadModal from './NewLeadModal'

interface Props {
  leads: Lead[]
  profile: Profile
}

const STATUS_META: Record<LeadStatus, { label: string; color: string; bg: string; dot: string }> = {
  cold_lead:      { label: 'Cold Lead', color: '#3B82F6', bg: 'rgba(59,130,246,0.12)',  dot: '#3B82F6' },
  hot_lead:       { label: 'Hot Lead',  color: '#F97316', bg: 'rgba(249,115,22,0.12)',  dot: '#F97316' },
  demo_scheduled: { label: 'Demo',      color: '#D97706', bg: 'rgba(217,119,6,0.12)',   dot: '#D97706' },
  customer:       { label: 'Customer',  color: '#22C55E', bg: 'rgba(34,197,94,0.12)',   dot: '#22C55E' },
  competitor:     { label: 'Competitor',color: '#EF4444', bg: 'rgba(239,68,68,0.12)',   dot: '#EF4444' },
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
  const d = new Date(updatedAt)
  if (isToday(d)) return 'Last visit: Today'
  return `Last visit: ${formatDistanceToNow(d, { addSuffix: false })} ago`
}

export default function LeadListView({ leads: initialLeads, profile }: Props) {
  const [leads, setLeads] = useState<Lead[]>(initialLeads)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<LeadStatus | 'all'>('all')
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [isCheckInOpen, setIsCheckInOpen] = useState(false)
  const [isNewLeadOpen, setIsNewLeadOpen] = useState(false)

  const leadsToday = leads.filter(l => isToday(new Date(l.created_at))).length

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

  function handleLeadUpdate(updated: Lead) {
    setLeads(prev => prev.map(l => (l.id === updated.id ? updated : l)))
    setSelectedLead(updated)
  }

  function handleLeadDelete(leadId: string) {
    setLeads(prev => prev.filter(l => l.id !== leadId))
    setIsDrawerOpen(false)
    setSelectedLead(null)
  }

  function handleLeadCreated(newLead: Lead) {
    setLeads(prev => [newLead, ...prev])
    setIsNewLeadOpen(false)
    toast.success('Lead added!')
  }

  return (
    <div className="bg-[#0A0A0A] pb-24">
      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2.5 px-4 py-3.5">
        {[
          { value: String(leadsToday), label: 'Leads Today' },
          { value: '--',               label: 'Check-ins' },
          { value: '--',               label: 'KM Today' },
        ].map(({ value, label }) => (
          <div
            key={label}
            className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-3"
          >
            <p className="text-[22px] font-bold leading-tight tracking-tight text-[#D97706]">
              {value}
            </p>
            <p className="mt-0.5 text-[11px] font-medium text-[#7A7A7A]">{label}</p>
          </div>
        ))}
      </div>

      {/* Search bar */}
      <div className="relative px-4 pb-3">
        <Search
          size={15}
          className="pointer-events-none absolute left-7 top-1/2 -translate-y-1/2 text-[#555]"
        />
        <input
          type="text"
          placeholder="Search leads…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full rounded-lg border border-[#2A2A2A] bg-[#1A1A1A] py-2.5 pl-8 pr-3 text-[13px] text-white outline-none placeholder:text-[#555] focus:border-[#D97706] transition-colors"
        />
      </div>

      {/* Filter pills */}
      <div className="flex gap-1.5 overflow-x-auto px-4 pb-3 [&::-webkit-scrollbar]:hidden">
        {FILTER_PILLS.map(({ label, value }) => (
          <button
            key={value}
            type="button"
            onClick={() => setStatusFilter(value)}
            className={`flex-shrink-0 rounded-full px-3 py-1 text-[12px] font-medium transition-colors ${
              statusFilter === value
                ? 'bg-[#D97706] text-white'
                : 'border border-[#2A2A2A] bg-[#1A1A1A] text-[#7A7A7A] hover:text-[#A0A0A0]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Lead cards */}
      <div className="flex flex-col gap-2.5 px-4">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <Coffee size={40} className="text-[#2A2A2A]" />
            <p className="mt-3 text-[15px] font-medium text-[#555]">No leads found</p>
            <p className="mt-1 text-[13px] text-[#444]">Add your first lead to get started</p>
          </div>
        ) : (
          filtered.map(lead => {
            const meta = STATUS_META[lead.status]
            return (
              <div
                key={lead.id}
                className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-3.5"
              >
                {/* Top row */}
                <div
                  className="flex cursor-pointer items-start gap-2"
                  onClick={() => openDrawer(lead)}
                >
                  <span
                    className="mt-1 h-2 w-2 flex-shrink-0 rounded-full"
                    style={{ backgroundColor: meta.dot }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-[14px] font-semibold leading-tight text-white">
                      {lead.cafe_name}
                    </p>
                    {lead.location_address && (
                      <p className="mt-0.5 truncate text-[12px] text-[#555]">
                        {lead.location_address}
                      </p>
                    )}
                  </div>
                  <span
                    className="flex-shrink-0 rounded-md px-2 py-0.5 text-[11px] font-medium"
                    style={{ backgroundColor: meta.bg, color: meta.color }}
                  >
                    {meta.label}
                  </span>
                </div>

                {/* Middle row */}
                <div
                  className="my-2 flex cursor-pointer items-center gap-2 text-[12px] text-[#7A7A7A]"
                  onClick={() => openDrawer(lead)}
                >
                  <User size={13} className="text-[#555]" />
                  <span>{lead.poc_name || '—'}</span>
                  <span className="text-[#333]">•</span>
                  <Phone size={13} className="text-[#555]" />
                  <span>{lead.poc_contact || '—'}</span>
                </div>

                {/* Bottom row */}
                <div className="flex items-center justify-between border-t border-[#222] pt-2.5">
                  <span className="rounded-md border border-[#222] bg-[#161616] px-2 py-1 text-[11px] text-[#444]">
                    {lastVisitLabel(lead.updated_at)}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => openCheckIn(lead)}
                      className="rounded-md bg-[#D97706] px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-[#B45309] transition-colors"
                    >
                      Check In
                    </button>
                    <button
                      type="button"
                      onClick={() => toast.info('Schedule feature coming soon')}
                      className="rounded-md border border-[#2A2A2A] px-2.5 py-1 text-[11px] font-medium text-[#A0A0A0] hover:text-white transition-colors"
                    >
                      Schedule
                    </button>
                    <button
                      type="button"
                      onClick={() => openDrawer(lead)}
                      className="rounded-md px-2 py-1 text-[11px] font-medium text-[#7A7A7A] hover:text-white transition-colors"
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
        className="fixed bottom-24 right-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#D97706] shadow-lg hover:bg-[#B45309] transition-colors"
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
      />

      {selectedLead && (
        <CheckInModal
          lead={selectedLead}
          isOpen={isCheckInOpen}
          onClose={() => setIsCheckInOpen(false)}
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

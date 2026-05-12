'use client'

import dynamic from 'next/dynamic'
import { useState } from 'react'
import { MapPin, X } from 'lucide-react'
import type { Lead, LeadStatus, Profile } from '@/types'
import LeadDetailsDrawer from './LeadDetailsDrawer'
import CheckInModal from './CheckInModal'

const LeafletMap = dynamic(() => import('./LeafletMap'), { ssr: false })

const STATUS_META: Record<LeadStatus, { label: string; color: string; bg: string; dot: string }> = {
  cold_lead:      { label: 'Cold Lead',  color: '#3B82F6', bg: 'rgba(59,130,246,0.12)',  dot: '#3B82F6' },
  hot_lead:       { label: 'Hot Lead',   color: '#F97316', bg: 'rgba(249,115,22,0.12)',  dot: '#F97316' },
  demo_scheduled: { label: 'Demo',       color: '#D97706', bg: 'rgba(217,119,6,0.12)',   dot: '#D97706' },
  customer:       { label: 'Customer',   color: '#22C55E', bg: 'rgba(34,197,94,0.12)',   dot: '#22C55E' },
  competitor:     { label: 'Competitor', color: '#EF4444', bg: 'rgba(239,68,68,0.12)',   dot: '#EF4444' },
}

const FILTER_PILLS: { label: string; value: LeadStatus | 'all' }[] = [
  { label: 'All',        value: 'all' },
  { label: 'Cold',       value: 'cold_lead' },
  { label: 'Hot',        value: 'hot_lead' },
  { label: 'Demo',       value: 'demo_scheduled' },
  { label: 'Customer',   value: 'customer' },
  { label: 'Competitor', value: 'competitor' },
]

interface Props {
  leads: Lead[]
  profile: Profile
}

export default function MapView({ leads, profile }: Props) {
  const [filter, setFilter] = useState<LeadStatus | 'all'>('all')
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [isCheckInOpen, setIsCheckInOpen] = useState(false)
  const [localLeads, setLocalLeads] = useState(leads)

  const filtered =
    filter === 'all' ? localLeads : localLeads.filter(l => l.status === filter)

  const mappedCount = filtered.filter(
    l => l.latitude != null && l.longitude != null
  ).length

  function handleMarkerClick(lead: Lead) {
    setSelectedLead(lead)
  }

  function handleLeadUpdate(updated: Lead) {
    setLocalLeads(prev => prev.map(l => (l.id === updated.id ? updated : l)))
    setSelectedLead(updated)
  }

  function handleLeadDelete(leadId: string) {
    setLocalLeads(prev => prev.filter(l => l.id !== leadId))
    setSelectedLead(null)
    setIsDrawerOpen(false)
  }

  return (
    <div className="relative" style={{ height: 'calc(100dvh - 5.75rem)' }}>
      {/* Filter pills — floating over map */}
      <div className="absolute left-0 right-0 top-0 z-[400] flex gap-1.5 overflow-x-auto px-3 py-2 [&::-webkit-scrollbar]:hidden">
        {FILTER_PILLS.map(({ label, value }) => (
          <button
            key={value}
            type="button"
            onClick={() => setFilter(value)}
            className={`flex-shrink-0 rounded-full px-3 py-1 text-[11px] font-medium shadow-lg transition-colors ${
              filter === value
                ? 'bg-[#D97706] text-white'
                : 'border border-[#2A2A2A] bg-[#1A1A1A]/90 text-[#A0A0A0] backdrop-blur-sm'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Pin count badge */}
      <div className="absolute right-3 top-10 z-[400]">
        <div className="flex items-center gap-1.5 rounded-lg border border-[#2A2A2A] bg-[#1A1A1A]/90 px-2.5 py-1.5 shadow-lg backdrop-blur-sm">
          <MapPin size={12} className="text-[#D97706]" />
          <span className="text-[11px] font-medium text-[#A0A0A0]">
            {mappedCount} pin{mappedCount !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Map */}
      <LeafletMap leads={filtered} onMarkerClick={handleMarkerClick} />

      {/* Bottom popup for selected lead */}
      {selectedLead && !isDrawerOpen && !isCheckInOpen && (
        <div className="absolute bottom-20 left-0 right-0 z-[400] px-3">
          <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A]/95 p-4 shadow-2xl backdrop-blur-sm">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span
                    className="h-2 w-2 flex-shrink-0 rounded-full"
                    style={{ backgroundColor: STATUS_META[selectedLead.status].dot }}
                  />
                  <p className="truncate text-[14px] font-semibold text-white">
                    {selectedLead.cafe_name}
                  </p>
                  <span
                    className="flex-shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-medium"
                    style={{
                      backgroundColor: STATUS_META[selectedLead.status].bg,
                      color: STATUS_META[selectedLead.status].color,
                    }}
                  >
                    {STATUS_META[selectedLead.status].label}
                  </span>
                </div>
                {selectedLead.location_address && (
                  <p className="mt-1 truncate text-[12px] text-[#7A7A7A]">
                    {selectedLead.location_address}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setSelectedLead(null)}
                className="flex-shrink-0 rounded-lg border border-[#2A2A2A] p-1 text-[#7A7A7A] hover:text-white transition-colors"
              >
                <X size={14} />
              </button>
            </div>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => setIsCheckInOpen(true)}
                className="flex-1 rounded-lg bg-[#D97706] py-2 text-[12px] font-semibold text-white hover:bg-[#B45309] transition-colors"
              >
                Check In
              </button>
              <button
                type="button"
                onClick={() => setIsDrawerOpen(true)}
                className="flex-1 rounded-lg border border-[#2A2A2A] py-2 text-[12px] font-medium text-[#A0A0A0] hover:text-white transition-colors"
              >
                View Details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Drawer & modals */}
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
          onCheckedIn={handleLeadUpdate}
          profile={profile}
        />
      )}
    </div>
  )
}

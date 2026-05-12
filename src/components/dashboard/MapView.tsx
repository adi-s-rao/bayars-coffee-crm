'use client'

import dynamic from 'next/dynamic'
import { useState } from 'react'
import { Crosshair, MapPin, X } from 'lucide-react'
import { toast } from 'sonner'
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

const STATUS_KEY: Record<string, LeadStatus> = {
  'Cold Lead':  'cold_lead',
  'Hot Lead':   'hot_lead',
  'Demo':       'demo_scheduled',
  'Customer':   'customer',
  'Competitor': 'competitor',
}

const FILTER_LABELS = ['All', 'Cold Lead', 'Hot Lead', 'Demo', 'Customer', 'Competitor']

interface Props {
  leads: Lead[]
  profile: Profile
}

export default function MapView({ leads, profile }: Props) {
  const [activeFilter, setActiveFilter] = useState('All')
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [isCheckInOpen, setIsCheckInOpen] = useState(false)
  const [localLeads, setLocalLeads] = useState(leads)
  const [flyTo, setFlyTo] = useState<[number, number] | undefined>()

  const filtered = activeFilter === 'All'
    ? localLeads
    : localLeads.filter(l => l.status === STATUS_KEY[activeFilter])

  const mappedCount = filtered.filter(l => l.latitude != null && l.longitude != null).length

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

  function handleMyLocation() {
    navigator.geolocation.getCurrentPosition(
      pos => setFlyTo([pos.coords.latitude, pos.coords.longitude]),
      () => toast.error('Could not get your location')
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100dvh - 160px)' }}>
      {/* Filter pills — dedicated row */}
      <div style={{
        background: '#141414',
        borderBottom: '1px solid #1E1E1E',
        padding: '10px 16px',
        display: 'flex',
        gap: '6px',
        overflowX: 'auto',
        flexShrink: 0,
        WebkitOverflowScrolling: 'touch',
      }}
        className="[&::-webkit-scrollbar]:hidden"
      >
        {FILTER_LABELS.map(f => (
          <button
            key={f}
            type="button"
            onClick={() => setActiveFilter(f)}
            style={{
              background: activeFilter === f ? '#D97706' : '#1A1A1A',
              color: activeFilter === f ? '#FFF' : '#7A7A7A',
              border: activeFilter === f ? 'none' : '1px solid #2A2A2A',
              borderRadius: '20px',
              padding: '5px 12px',
              fontSize: '12px',
              fontWeight: 500,
              fontFamily: 'inherit',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Map area */}
      <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
        {/* My Location button */}
        <div className="absolute right-3 top-3 z-[400]">
          <button
            type="button"
            onClick={handleMyLocation}
            className="flex items-center justify-center rounded-lg border border-[#2A2A2A] bg-[#1A1A1A]/90 p-2 shadow-lg backdrop-blur-sm transition-colors hover:bg-[#2A2A2A]"
            title="My location"
          >
            <Crosshair size={16} className="text-[#D97706]" />
          </button>
        </div>

        {/* Pin count badge */}
        <div className="absolute right-3 top-14 z-[400]">
          <div className="flex items-center gap-1.5 rounded-lg border border-[#2A2A2A] bg-[#1A1A1A]/90 px-2.5 py-1.5 shadow-lg backdrop-blur-sm">
            <MapPin size={12} className="text-[#D97706]" />
            <span className="text-[11px] font-medium text-[#A0A0A0]">
              {mappedCount} pin{mappedCount !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {/* Map */}
        <LeafletMap leads={filtered} onMarkerClick={handleMarkerClick} flyTo={flyTo} />

        {/* Bottom popup for selected lead */}
        {selectedLead && !isDrawerOpen && !isCheckInOpen && (
          <div className="absolute bottom-4 left-0 right-0 z-[400] px-3">
            <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A]/95 p-4 shadow-2xl backdrop-blur-sm transition-all">
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
      </div>

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

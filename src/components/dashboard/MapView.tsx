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
  cold_lead:      { label: 'Cold Lead',  color: '#0A84FF', bg: 'rgba(10,132,255,0.15)',  dot: '#0A84FF' },
  hot_lead:       { label: 'Hot Lead',   color: '#FF9F0A', bg: 'rgba(255,159,10,0.15)',  dot: '#FF9F0A' },
  demo_scheduled: { label: 'Demo',       color: '#D97706', bg: 'rgba(217,119,6,0.15)',   dot: '#D97706' },
  customer:       { label: 'Customer',   color: '#30D158', bg: 'rgba(48,209,88,0.15)',   dot: '#30D158' },
  competitor:     { label: 'Competitor', color: '#FF453A', bg: 'rgba(255,69,58,0.15)',   dot: '#FF453A' },
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
      {/* Filter pills — dedicated row with solid background */}
      <div
        style={{
          background: '#000',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          padding: '10px 16px',
          display: 'flex',
          gap: '8px',
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
              background: activeFilter === f ? '#D97706' : 'rgba(255,255,255,0.07)',
              color: activeFilter === f ? '#FFF' : '#8E8E93',
              border: 'none',
              borderRadius: '20px',
              padding: '6px 14px',
              fontSize: '13px',
              fontWeight: 500,
              fontFamily: 'inherit',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              flexShrink: 0,
              transition: 'all 0.15s',
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
            className="flex items-center justify-center rounded-xl border border-white/[0.08] bg-black/90 p-2.5 shadow-lg backdrop-blur-sm transition-all active:scale-[0.92] hover:bg-white/[0.10]"
            title="My location"
          >
            <Crosshair size={16} className="text-[#D97706]" />
          </button>
        </div>

        {/* Pin count badge */}
        <div className="absolute right-3 top-14 z-[400]">
          <div className="flex items-center gap-1.5 rounded-xl border border-white/[0.08] bg-black/90 px-2.5 py-1.5 shadow-lg backdrop-blur-sm">
            <MapPin size={12} className="text-[#D97706]" />
            <span className="text-[11px] font-medium text-[#8E8E93]">
              {mappedCount} pin{mappedCount !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {/* Map */}
        <LeafletMap leads={filtered} onMarkerClick={handleMarkerClick} flyTo={flyTo} />

        {/* Bottom popup for selected lead */}
        {selectedLead && !isDrawerOpen && !isCheckInOpen && (
          <div className="absolute bottom-4 left-0 right-0 z-[400] px-3">
            <div className="rounded-2xl border border-white/[0.08] bg-black/95 p-4 shadow-2xl backdrop-blur-xl transition-all">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2 w-2 flex-shrink-0 rounded-full"
                      style={{ backgroundColor: STATUS_META[selectedLead.status].dot }}
                    />
                    <p className="truncate text-[15px] font-semibold text-white">
                      {selectedLead.cafe_name}
                    </p>
                    <span
                      className="flex-shrink-0 rounded-lg px-1.5 py-0.5 text-[11px] font-semibold"
                      style={{
                        backgroundColor: STATUS_META[selectedLead.status].bg,
                        color: STATUS_META[selectedLead.status].color,
                      }}
                    >
                      {STATUS_META[selectedLead.status].label}
                    </span>
                  </div>
                  {selectedLead.location_address && (
                    <p className="mt-1 truncate text-[13px] text-[#8E8E93]">
                      {selectedLead.location_address}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedLead(null)}
                  className="flex-shrink-0 rounded-xl bg-white/[0.07] p-1.5 text-[#8E8E93] transition-colors hover:text-white"
                >
                  <X size={14} />
                </button>
              </div>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsCheckInOpen(true)}
                  className="flex-1 rounded-xl bg-[#D97706] py-2.5 text-[13px] font-semibold text-white transition-all active:scale-[0.96] hover:bg-[#B45309]"
                >
                  Check In
                </button>
                <button
                  type="button"
                  onClick={() => setIsDrawerOpen(true)}
                  className="flex-1 rounded-xl bg-white/[0.07] py-2.5 text-[13px] font-medium text-[#8E8E93] transition-all hover:text-white"
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

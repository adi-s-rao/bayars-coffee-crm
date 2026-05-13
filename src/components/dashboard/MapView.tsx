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
  cold_lead:  { label: 'Cold Lead',  color: '#0A84FF', bg: 'rgba(10,132,255,0.15)',  dot: '#0A84FF' },
  hot_lead:   { label: 'Hot Lead',   color: '#FF9F0A', bg: 'rgba(255,159,10,0.15)',  dot: '#FF9F0A' },
  customer:   { label: 'Customer',   color: '#30D158', bg: 'rgba(48,209,88,0.15)',   dot: '#30D158' },
  competitor: { label: 'Competitor', color: '#FF453A', bg: 'rgba(255,69,58,0.15)',   dot: '#FF453A' },
}

const STATUS_KEY: Record<string, LeadStatus> = {
  'Cold Lead':  'cold_lead',
  'Hot Lead':   'hot_lead',
  'Customer':   'customer',
  'Competitor': 'competitor',
}

const FILTER_LABELS = ['All', 'Cold Lead', 'Hot Lead', 'Customer', 'Competitor']

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
      {/* Filter pills */}
      <div
        style={{
          background: 'var(--bg-page)',
          borderBottom: '0.5px solid var(--separator)',
          padding: '10px 16px',
          display: 'flex',
          gap: '8px',
          overflowX: 'auto',
          flexShrink: 0,
          position: 'relative',
          zIndex: 1001,
        }}
        className="[&::-webkit-scrollbar]:hidden"
      >
        {FILTER_LABELS.map(f => (
          <button
            key={f}
            type="button"
            onClick={() => setActiveFilter(f)}
            className="transition-all active:scale-[0.95]"
            style={{
              background: activeFilter === f ? '#D97706' : 'rgba(118,118,128,0.2)',
              color: activeFilter === f ? '#FFF' : 'rgba(235,235,245,0.6)',
              border: 'none',
              borderRadius: '8px',
              height: '32px',
              padding: '0 14px',
              fontSize: '15px',
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
            className="flex items-center justify-center rounded-xl shadow-lg transition-all active:scale-[0.92]"
            style={{
              background: 'rgba(28,28,30,0.85)',
              backdropFilter: 'blur(20px) saturate(180%)',
              WebkitBackdropFilter: 'blur(20px) saturate(180%)',
              border: '0.5px solid rgba(255,255,255,0.12)',
              padding: '10px',
            }}
            title="My location"
          >
            <Crosshair size={16} style={{ color: '#D97706' }} />
          </button>
        </div>

        {/* Pin count badge */}
        <div className="absolute right-3 top-14 z-[400]">
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(28,28,30,0.85)',
              backdropFilter: 'blur(20px) saturate(180%)',
              WebkitBackdropFilter: 'blur(20px) saturate(180%)',
              border: '0.5px solid rgba(255,255,255,0.12)',
              borderRadius: '10px',
              padding: '6px 10px',
            }}
          >
            <MapPin size={12} style={{ color: '#D97706' }} />
            <span style={{ fontSize: '11px', fontWeight: 500, color: 'rgba(235,235,245,0.6)' }}>
              {mappedCount} pin{mappedCount !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {/* Map */}
        <LeafletMap leads={filtered} onMarkerClick={handleMarkerClick} flyTo={flyTo} />

        {/* Bottom popup for selected lead */}
        {selectedLead && !isDrawerOpen && !isCheckInOpen && (
          <div className="absolute bottom-4 left-0 right-0 px-3" style={{ zIndex: 1002 }}>
            <div
              style={{
                borderRadius: '16px',
                background: 'rgba(28,28,30,0.95)',
                backdropFilter: 'blur(40px) saturate(180%)',
                WebkitBackdropFilter: 'blur(40px) saturate(180%)',
                border: '0.5px solid rgba(255,255,255,0.12)',
                padding: '16px',
                boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span
                      style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        flexShrink: 0,
                        background: STATUS_META[selectedLead.status].dot,
                      }}
                    />
                    <p style={{ fontSize: '15px', fontWeight: 600, color: '#FFF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {selectedLead.cafe_name}
                    </p>
                    <span
                      style={{
                        flexShrink: 0,
                        borderRadius: '6px',
                        padding: '2px 8px',
                        fontSize: '11px',
                        fontWeight: 600,
                        background: STATUS_META[selectedLead.status].bg,
                        color: STATUS_META[selectedLead.status].color,
                      }}
                    >
                      {STATUS_META[selectedLead.status].label}
                    </span>
                  </div>
                  {selectedLead.location_address && (
                    <p style={{ marginTop: '4px', fontSize: '13px', color: 'rgba(235,235,245,0.45)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {selectedLead.location_address}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedLead(null)}
                  className="transition-colors active:scale-[0.92]"
                  style={{
                    flexShrink: 0,
                    background: 'rgba(118,118,128,0.2)',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '6px',
                    color: 'rgba(235,235,245,0.6)',
                    cursor: 'pointer',
                  }}
                >
                  <X size={14} />
                </button>
              </div>
              <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setIsCheckInOpen(true)}
                  className="flex-1 transition-all active:scale-[0.96]"
                  style={{
                    borderRadius: '10px',
                    background: '#D97706',
                    padding: '10px',
                    fontSize: '13px',
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
                  onClick={() => setIsDrawerOpen(true)}
                  className="flex-1 transition-all"
                  style={{
                    borderRadius: '10px',
                    background: 'rgba(118,118,128,0.2)',
                    padding: '10px',
                    fontSize: '13px',
                    fontWeight: 500,
                    color: 'rgba(235,235,245,0.7)',
                    border: 'none',
                    cursor: 'pointer',
                  }}
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

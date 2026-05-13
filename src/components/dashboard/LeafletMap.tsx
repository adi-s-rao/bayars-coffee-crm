'use client'

import { useEffect, useMemo } from 'react'
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { Lead, LeadStatus } from '@/types'

const STATUS_COLOR: Record<LeadStatus, string> = {
  cold_lead:      '#3B82F6',
  hot_lead:       '#F97316',
  demo_scheduled: '#D97706',
  customer:       '#22C55E',
  competitor:     '#EF4444',
}

function makeIcon(color: string): L.DivIcon {
  return L.divIcon({
    className: '',
    html: `<div style="width:14px;height:14px;border-radius:50%;background:${color};border:2px solid rgba(255,255,255,0.8);box-shadow:0 0 6px ${color}80;"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  })
}

function FlyToController({ flyTo }: { flyTo?: [number, number] }) {
  const map = useMap()
  useEffect(() => {
    if (flyTo) map.flyTo(flyTo, 15)
  }, [flyTo, map])
  return null
}

interface Props {
  leads: Lead[]
  onMarkerClick: (lead: Lead) => void
  flyTo?: [number, number]
}

export default function LeafletMap({ leads, onMarkerClick, flyTo }: Props) {

  const mappedLeads = useMemo(
    () => leads.filter(l => l.latitude != null && l.longitude != null),
    [leads]
  )

  const center: [number, number] =
    mappedLeads.length > 0
      ? [mappedLeads[0].latitude!, mappedLeads[0].longitude!]
      : [25.2048, 55.2708]

  return (
    <>
      <style>{`
        .leaflet-popup { z-index: 999 !important; }
        .leaflet-control { z-index: 999 !important; }
      `}</style>
    <MapContainer center={center} zoom={11} style={{ height: '100%', width: '100%', background: '#e8e8e8' }} zoomControl>
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        maxZoom={19}
      />
      <FlyToController flyTo={flyTo} />
      {mappedLeads.map(lead => (
        <Marker
          key={lead.id}
          position={[lead.latitude!, lead.longitude!]}
          icon={makeIcon(STATUS_COLOR[lead.status])}
          eventHandlers={{ click: () => onMarkerClick(lead) }}
        />
      ))}
    </MapContainer>
    </>
  )
}

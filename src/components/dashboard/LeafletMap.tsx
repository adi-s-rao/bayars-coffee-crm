'use client'

import { useEffect, useMemo } from 'react'
import { MapContainer, TileLayer, Marker } from 'react-leaflet'
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

interface Props {
  leads: Lead[]
  onMarkerClick: (lead: Lead) => void
}

export default function LeafletMap({ leads, onMarkerClick }: Props) {
  useEffect(() => {
    const style = document.createElement('style')
    style.id = 'leaflet-dark-override'
    style.textContent = `
      .leaflet-container { background: #0A0A0A !important; }
      .leaflet-control-zoom a { background: #1A1A1A !important; color: #A0A0A0 !important; border-color: #2A2A2A !important; }
      .leaflet-control-zoom a:hover { background: #2A2A2A !important; color: #fff !important; }
      .leaflet-control-attribution { background: rgba(10,10,10,0.7) !important; color: #555 !important; font-size: 10px; }
      .leaflet-control-attribution a { color: #777 !important; }
    `
    document.head.appendChild(style)
    return () => {
      document.getElementById('leaflet-dark-override')?.remove()
    }
  }, [])

  const mappedLeads = useMemo(
    () => leads.filter(l => l.latitude != null && l.longitude != null),
    [leads]
  )

  const center: [number, number] =
    mappedLeads.length > 0
      ? [mappedLeads[0].latitude!, mappedLeads[0].longitude!]
      : [25.2048, 55.2708]

  return (
    <MapContainer center={center} zoom={11} className="h-full w-full" zoomControl>
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>'
        subdomains="abcd"
        maxZoom={19}
      />
      {mappedLeads.map(lead => (
        <Marker
          key={lead.id}
          position={[lead.latitude!, lead.longitude!]}
          icon={makeIcon(STATUS_COLOR[lead.status])}
          eventHandlers={{ click: () => onMarkerClick(lead) }}
        />
      ))}
    </MapContainer>
  )
}

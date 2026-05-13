'use client'

import { useEffect, useRef, useState } from 'react'
import { ChevronDown, Loader2, MapPin, X } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { toast } from 'sonner'
import { COFFEE_SKUS, type CheckIn, type CheckInType, type Lead, type LeadStatus } from '@/types'
import dynamic from 'next/dynamic'

const ConversionModal = dynamic(() => import('./ConversionModal'), { ssr: false })

interface Props {
  lead: Lead | null
  isOpen: boolean
  onClose: () => void
  onUpdate: (lead: Lead) => void
  onDelete: (leadId: string) => void
  refreshTrigger?: number
}

const STATUS_META: Record<LeadStatus, { label: string; color: string; bg: string }> = {
  cold_lead:  { label: 'Cold Lead',  color: '#0A84FF', bg: 'rgba(10,132,255,0.15)' },
  hot_lead:   { label: 'Hot Lead',   color: '#FF9F0A', bg: 'rgba(255,159,10,0.15)' },
  customer:   { label: 'Customer',   color: '#30D158', bg: 'rgba(48,209,88,0.15)'  },
  competitor: { label: 'Competitor', color: '#FF453A', bg: 'rgba(255,69,58,0.15)'  },
}

const CHECKIN_TYPE_COLOR: Record<CheckInType, string> = {
  visit:     '#0A84FF',
  demo:      '#FF9F0A',
  workshop:  '#BF5AF2',
  start_day: '#30D158',
  end_day:   '#FF453A',
  new_lead:  '#D97706',
}

type DrawerTab = 'overview' | 'coffee' | 'activity'
type EditableField = 'coffee_machine' | 'current_bean_brand'
type NumericField = 'bean_usage_kg' | 'cappuccino_price'

const fieldRowStyle = (isLast: boolean): React.CSSProperties => ({
  padding: '14px 16px',
  borderBottom: isLast ? 'none' : '0.5px solid var(--separator)',
})

const labelStyle: React.CSSProperties = {
  fontSize: '12px',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  color: 'var(--label-tertiary)',
  marginBottom: '4px',
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'var(--bg-input)',
  borderRadius: '10px',
  border: 'none',
  padding: '10px 14px',
  fontSize: '15px',
  color: 'var(--label-primary)',
  outline: 'none',
  boxSizing: 'border-box',
  fontFamily: 'inherit',
}

export default function LeadDetailsDrawer({ lead, isOpen, onClose, onUpdate, onDelete, refreshTrigger }: Props) {
  const [activeTab, setActiveTab] = useState<DrawerTab>('overview')
  const overviewRef = useRef<HTMLButtonElement>(null)
  const coffeeRef = useRef<HTMLButtonElement>(null)
  const activityRef = useRef<HTMLButtonElement>(null)
  const [underline, setUnderline] = useState({ left: 0, width: 0 })

  const [localLead, setLocalLead] = useState<Lead | null>(lead)
  const [editingField, setEditingField] = useState<EditableField | NumericField | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [locationLoading, setLocationLoading] = useState(false)
  const [checkins, setCheckins] = useState<CheckIn[]>([])
  const [checkinsLoading, setCheckinsLoading] = useState(false)
  const [showConversionModal, setShowConversionModal] = useState(false)

  // SKU dropdown for sample
  const [skuSearch, setSkuSearch] = useState('')
  const [skuOpen, setSkuOpen] = useState(false)
  const skuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (lead) {
      setLocalLead(lead)
      setSkuSearch('')
    }
  }, [lead])

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    if (isOpen) document.addEventListener('keydown', handleEsc)
    return () => document.removeEventListener('keydown', handleEsc)
  }, [isOpen, onClose])

  useEffect(() => {
    const refs: Record<DrawerTab, React.RefObject<HTMLButtonElement | null>> = {
      overview: overviewRef,
      coffee:   coffeeRef,
      activity: activityRef,
    }
    const ref = refs[activeTab]
    if (ref.current) {
      setUnderline({ left: ref.current.offsetLeft, width: ref.current.offsetWidth })
    }
  }, [activeTab])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (skuRef.current && !skuRef.current.contains(e.target as Node)) {
        setSkuOpen(false)
      }
    }
    if (skuOpen) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [skuOpen])

  useEffect(() => {
    if (!lead?.id) return
    setCheckinsLoading(true)
    fetch(`/api/leads/${lead.id}/checkins`)
      .then(r => r.json())
      .then((d: { checkins: CheckIn[] }) => setCheckins(d.checkins ?? []))
      .catch(() => setCheckins([]))
      .finally(() => setCheckinsLoading(false))
  }, [lead?.id, refreshTrigger])

  async function handleUpdateLocation() {
    setLocationLoading(true)
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
        })
      )
      const lat = pos.coords.latitude
      const lng = pos.coords.longitude
      let addr = localLead?.location_address ?? ''
      try {
        const res = await fetch(`/api/geocode?lat=${lat}&lon=${lng}`)
        if (res.ok) {
          const { address } = await res.json() as { address: string }
          addr = address
        }
      } catch { /* use existing */ }
      setLocalLead(prev => prev ? { ...prev, latitude: lat, longitude: lng, location_address: addr } : prev)
      toast.success('Location updated — save to persist')
    } catch {
      toast.error('Could not get your location')
    } finally {
      setLocationLoading(false)
    }
  }

  async function handleStatusChange(newStatus: LeadStatus) {
    setLocalLead(prev => prev ? { ...prev, status: newStatus } : prev)
    if (newStatus === 'customer') {
      setShowConversionModal(true)
    }
  }

  async function handleSave() {
    if (!localLead) return
    setSaving(true)
    try {
      const res = await fetch(`/api/leads/${localLead.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: localLead.status,
          latitude: localLead.latitude,
          longitude: localLead.longitude,
          location_address: localLead.location_address,
          poc_name: localLead.poc_name,
          poc_contact: localLead.poc_contact,
          remarks: localLead.remarks,
          coffee_machine: localLead.coffee_machine,
          current_bean_brand: localLead.current_bean_brand,
          bean_usage_kg: localLead.bean_usage_kg,
          cappuccino_price: localLead.cappuccino_price,
          sample_name: localLead.sample_name,
          sample_quantity_grams: localLead.sample_quantity_grams,
        }),
      })
      if (!res.ok) throw new Error('Save failed')
      const { lead: updated } = await res.json() as { lead: Lead }
      onUpdate(updated)
      toast.success('Lead saved')
    } catch {
      toast.error('Failed to save changes')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!localLead) return
    if (!window.confirm('Delete this lead? This cannot be undone.')) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/leads/${localLead.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Delete failed')
      onDelete(localLead.id)
      toast.success('Lead deleted')
    } catch {
      toast.error('Failed to delete lead')
    } finally {
      setDeleting(false)
    }
  }

  if (!lead || !localLead) return null

  const statusMeta = STATUS_META[localLead.status]

  function EditableRow({ field, label, value, isLast }: { field: EditableField; label: string; value: string | undefined; isLast?: boolean }) {
    return (
      <div style={fieldRowStyle(!!isLast)}>
        <p style={labelStyle}>{label}</p>
        {editingField === field ? (
          <input
            type="text"
            defaultValue={value ?? ''}
            autoFocus
            onBlur={e => {
              setLocalLead(prev => prev ? { ...prev, [field]: e.target.value || undefined } : prev)
              setEditingField(null)
            }}
            style={inputStyle}
          />
        ) : (
          <p onClick={() => setEditingField(field)} style={{ fontSize: '17px', color: 'var(--label-primary)', cursor: 'pointer' }}>
            {value || '—'}
          </p>
        )}
      </div>
    )
  }

  function EditableNumericRow({ field, label, value, isLast }: { field: NumericField; label: string; value: number | undefined; isLast?: boolean }) {
    return (
      <div style={fieldRowStyle(!!isLast)}>
        <p style={labelStyle}>{label}</p>
        {editingField === field ? (
          <input
            type="number"
            defaultValue={value ?? ''}
            autoFocus
            onBlur={e => {
              const n = parseFloat(e.target.value)
              setLocalLead(prev => prev ? { ...prev, [field]: isNaN(n) ? undefined : n } : prev)
              setEditingField(null)
            }}
            style={inputStyle}
          />
        ) : (
          <p onClick={() => setEditingField(field)} style={{ fontSize: '17px', color: 'var(--label-primary)', cursor: 'pointer' }}>
            {value !== undefined ? value : '—'}
          </p>
        )}
      </div>
    )
  }

  const filteredSkus = COFFEE_SKUS.filter(s =>
    s.toLowerCase().includes(skuSearch.toLowerCase())
  )

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm"
          style={{ zIndex: 1100 }}
          onClick={onClose}
        />
      )}

      <div
        className={`fixed right-0 top-0 flex h-full w-full flex-col transition-transform duration-[280ms] ease-[cubic-bezier(0.32,0.72,0,1)] md:w-[420px] ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        style={{ background: 'var(--bg-card)', borderLeft: '0.5px solid var(--separator)', zIndex: 1110 }}
      >
        {/* Header */}
        <div style={{ borderBottom: '0.5px solid var(--separator)', padding: '20px 20px 0' }}>
          <div className="flex items-start justify-between gap-2">
            <p style={{ fontSize: '22px', fontWeight: 700, color: 'var(--label-primary)', lineHeight: 1.2 }}>{localLead.cafe_name}</p>
            <span style={{ flexShrink: 0, borderRadius: '8px', padding: '3px 8px', fontSize: '11px', fontWeight: 600, background: statusMeta.bg, color: statusMeta.color }}>
              {statusMeta.label}
            </span>
          </div>

          <div style={{ marginTop: '12px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {localLead.latitude && localLead.longitude && (
              <button
                type="button"
                onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${localLead.latitude},${localLead.longitude}`, '_blank')}
                className="flex items-center gap-1.5 transition-all active:scale-[0.96]"
                style={{ background: 'rgba(217,119,6,0.12)', border: '0.5px solid rgba(217,119,6,0.3)', borderRadius: '10px', padding: '8px 14px', fontSize: '13px', fontWeight: 500, color: '#D97706', cursor: 'pointer' }}
              >
                <MapPin size={13} />
                Navigate
              </button>
            )}
            <button
              type="button"
              onClick={handleUpdateLocation}
              disabled={locationLoading}
              className="flex items-center gap-1.5 transition-all active:scale-[0.96]"
              style={{ background: 'rgba(118,118,128,0.1)', border: '0.5px solid var(--separator)', borderRadius: '10px', padding: '8px 14px', fontSize: '13px', fontWeight: 500, color: 'var(--label-secondary)', cursor: 'pointer', opacity: locationLoading ? 0.5 : 1 }}
            >
              {locationLoading ? <Loader2 size={12} className="animate-spin" /> : <MapPin size={12} />}
              Update Location
            </button>
            <button
              type="button"
              onClick={onClose}
              className="ml-auto transition-colors hover:text-white active:scale-[0.92]"
              style={{ background: 'rgba(118,118,128,0.15)', border: 'none', borderRadius: '10px', padding: '8px', color: 'var(--label-secondary)', cursor: 'pointer' }}
            >
              <X size={15} />
            </button>
          </div>

          {/* Tab bar */}
          <div style={{ position: 'relative', display: 'flex', gap: '20px', borderBottom: '0.5px solid var(--separator)' }}>
            {([
              { key: 'overview' as DrawerTab, label: 'Overview',       ref: overviewRef  },
              { key: 'coffee'   as DrawerTab, label: 'Coffee Details', ref: coffeeRef    },
              { key: 'activity' as DrawerTab, label: 'Activity',       ref: activityRef  },
            ] as const).map(({ key, label, ref }) => (
              <button
                key={key}
                ref={ref}
                type="button"
                onClick={() => setActiveTab(key)}
                style={{ paddingBottom: '12px', fontSize: '15px', fontWeight: 500, color: activeTab === key ? 'var(--label-primary)' : 'var(--label-tertiary)', background: 'none', border: 'none', cursor: 'pointer', transition: 'color 0.15s ease' }}
              >
                {label}
              </button>
            ))}
            <div style={{ position: 'absolute', bottom: '-0.5px', height: '2px', borderRadius: '1px', background: '#D97706', transition: 'all 200ms ease', left: underline.left, width: underline.width }} />
          </div>
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto">
          {/* Overview */}
          {activeTab === 'overview' && (
            <div style={{ padding: '16px' }}>
              <div style={{ background: 'rgba(118,118,128,0.08)', borderRadius: '12px', overflow: 'hidden', marginBottom: '16px' }}>
                {/* Address */}
                <div style={{ ...fieldRowStyle(false), display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                  <MapPin size={15} style={{ marginTop: '2px', flexShrink: 0, color: 'var(--label-tertiary)' }} />
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: '15px', color: 'var(--label-secondary)' }}>
                      {localLead.location_address || 'No address'}
                    </p>
                  </div>
                </div>
                {/* POC */}
                <div style={{ ...fieldRowStyle(false), display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '15px', color: 'var(--label-secondary)' }}>{localLead.poc_name || '—'}</span>
                  {localLead.poc_contact && (
                    <a href={`tel:${localLead.poc_contact}`} style={{ fontSize: '15px', color: '#D97706', textDecoration: 'none' }}>
                      {localLead.poc_contact}
                    </a>
                  )}
                </div>
                {/* Status */}
                <div style={fieldRowStyle(false)}>
                  <p style={labelStyle}>Status</p>
                  <select
                    value={localLead.status}
                    onChange={e => void handleStatusChange(e.target.value as LeadStatus)}
                    style={{ ...inputStyle, cursor: 'pointer' }}
                  >
                    <option value="cold_lead">Cold Lead</option>
                    <option value="hot_lead">Hot Lead</option>
                    <option value="customer">Customer</option>
                    <option value="competitor">Competitor</option>
                  </select>
                </div>
                {/* Remarks */}
                <div style={fieldRowStyle(true)}>
                  <p style={labelStyle}>Remarks</p>
                  <textarea
                    rows={3}
                    value={localLead.remarks ?? ''}
                    onChange={e => setLocalLead(prev => prev ? { ...prev, remarks: e.target.value || undefined } : prev)}
                    placeholder="Add notes…"
                    style={{ ...inputStyle, resize: 'none' }}
                    className="placeholder:text-[rgba(235,235,245,0.3)]"
                  />
                </div>
              </div>
              <p style={{ fontSize: '12px', color: 'var(--label-tertiary)' }}>
                Updated {formatDistanceToNow(new Date(localLead.updated_at), { addSuffix: true })}
              </p>
            </div>
          )}

          {/* Coffee Details */}
          {activeTab === 'coffee' && (
            <div style={{ padding: '16px' }}>
              <div style={{ background: 'rgba(118,118,128,0.08)', borderRadius: '12px', overflow: 'hidden', marginBottom: '16px' }}>
                <EditableRow    field="coffee_machine"     label="Coffee Machine"     value={localLead.coffee_machine} />
                <EditableRow    field="current_bean_brand" label="Current Bean Brand" value={localLead.current_bean_brand} />
                <EditableNumericRow field="bean_usage_kg"  label="Bean Usage (kg/mo)" value={localLead.bean_usage_kg} />
                <EditableNumericRow field="cappuccino_price" label="Cappuccino Price" value={localLead.cappuccino_price} isLast />
              </div>

              {/* Sample section */}
              <div style={{ background: 'rgba(217,119,6,0.08)', borderRadius: '12px', padding: '16px', border: '0.5px solid rgba(217,119,6,0.2)' }}>
                <p style={{ fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#D97706', marginBottom: '14px' }}>Sample Given</p>

                {/* SKU dropdown */}
                <div ref={skuRef} style={{ position: 'relative', marginBottom: '12px' }}>
                  <p style={labelStyle}>Product SKU</p>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      placeholder="Search SKU…"
                      value={skuSearch || localLead.sample_name || ''}
                      onChange={e => { setSkuSearch(e.target.value); setLocalLead(prev => prev ? { ...prev, sample_name: undefined } : prev); setSkuOpen(true) }}
                      onFocus={() => setSkuOpen(true)}
                      style={inputStyle}
                      className="placeholder:text-[rgba(235,235,245,0.3)]"
                    />
                    <ChevronDown size={14} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: 'rgba(235,235,245,0.4)', pointerEvents: 'none' }} />
                  </div>
                  {skuOpen && filteredSkus.length > 0 && (
                    <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, background: 'var(--bg-card)', borderRadius: '10px', border: '0.5px solid var(--separator)', boxShadow: '0 8px 24px rgba(0,0,0,0.3)', zIndex: 100, maxHeight: '180px', overflowY: 'auto' }}>
                      {filteredSkus.map(sku => (
                        <button
                          key={sku}
                          type="button"
                          onMouseDown={() => { setLocalLead(prev => prev ? { ...prev, sample_name: sku } : prev); setSkuSearch(''); setSkuOpen(false) }}
                          style={{ width: '100%', textAlign: 'left', padding: '10px 14px', background: 'none', border: 'none', fontSize: '14px', color: 'var(--label-primary)', cursor: 'pointer', borderBottom: '0.5px solid var(--separator)' }}
                        >
                          {sku}
                        </button>
                      ))}
                    </div>
                  )}
                  {localLead.sample_name && (
                    <p style={{ marginTop: '4px', fontSize: '12px', color: '#D97706' }}>✓ {localLead.sample_name}</p>
                  )}
                </div>

                {/* Sample qty */}
                <div>
                  <p style={labelStyle}>Quantity (grams)</p>
                  <input
                    type="number"
                    min="0"
                    step="50"
                    placeholder="250"
                    value={localLead.sample_quantity_grams ?? ''}
                    onChange={e => {
                      const n = parseInt(e.target.value, 10)
                      setLocalLead(prev => prev ? { ...prev, sample_quantity_grams: isNaN(n) ? undefined : n } : prev)
                    }}
                    style={inputStyle}
                    className="placeholder:text-[rgba(235,235,245,0.3)]"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Activity */}
          {activeTab === 'activity' && (
            <div style={{ padding: '20px' }}>
              {checkinsLoading ? (
                <p style={{ fontSize: '14px', color: 'var(--label-tertiary)' }}>Loading…</p>
              ) : checkins.length === 0 ? (
                <p style={{ fontSize: '14px', color: 'var(--label-tertiary)' }}>No check-ins yet for this lead.</p>
              ) : (
                <div className="relative pl-5">
                  <div className="absolute bottom-2 left-[6px] top-2 w-px bg-white/[0.08]" />
                  {checkins.map(c => (
                    <div key={c.id} className="relative mb-5 last:mb-0">
                      <span
                        className="absolute -left-[18px] top-0.5 h-2 w-2 rounded-full"
                        style={{ backgroundColor: CHECKIN_TYPE_COLOR[c.type] }}
                      />
                      <p style={{ fontSize: '12px', color: 'var(--label-tertiary)' }}>
                        {formatDistanceToNow(new Date(c.created_at), { addSuffix: true })} · {c.user_name}
                      </p>
                      <div className="mt-1 flex items-center gap-1.5">
                        <span
                          style={{
                            borderRadius: '6px',
                            padding: '2px 6px',
                            fontSize: '11px',
                            fontWeight: 600,
                            textTransform: 'capitalize',
                            background: `${CHECKIN_TYPE_COLOR[c.type]}20`,
                            color: CHECKIN_TYPE_COLOR[c.type],
                          }}
                        >
                          {c.type.replace('_', ' ')}
                        </span>
                        {c.remarks && (
                          <span style={{ fontSize: '13px', color: 'var(--label-secondary)' }}>{c.remarks}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ paddingBottom: 'calc(16px + 80px)' }}>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
            style={{ height: '50px', borderRadius: '14px', width: 'calc(100% - 40px)', margin: '16px 20px 0', background: '#D97706', color: '#FFF', fontSize: '17px', fontWeight: 600, border: 'none', cursor: 'pointer', opacity: saving ? 0.5 : 1 }}
          >
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            style={{ width: '100%', textAlign: 'center', fontSize: '17px', color: '#FF453A', background: 'transparent', border: 'none', padding: '12px 20px 20px', cursor: 'pointer', opacity: deleting ? 0.5 : 1 }}
          >
            {deleting ? 'Deleting…' : 'Delete Lead'}
          </button>
        </div>
      </div>

      {/* Conversion modal — triggered when status changes to customer */}
      {localLead && (
        <ConversionModal
          lead={localLead}
          isOpen={showConversionModal}
          onClose={() => setShowConversionModal(false)}
          onConverted={(updatedLead: Lead) => {
            setShowConversionModal(false)
            onUpdate(updatedLead)
          }}
        />
      )}
    </>
  )
}

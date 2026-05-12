'use client'

import { useEffect, useRef, useState } from 'react'
import { MapPin, X } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { toast } from 'sonner'
import type { CheckIn, CheckInType, Lead, LeadStatus } from '@/types'

interface Props {
  lead: Lead | null
  isOpen: boolean
  onClose: () => void
  onUpdate: (lead: Lead) => void
  onDelete: (leadId: string) => void
  refreshTrigger?: number
}

const STATUS_META: Record<LeadStatus, { label: string; color: string; bg: string }> = {
  cold_lead:      { label: 'Cold Lead',  color: '#3B82F6', bg: 'rgba(59,130,246,0.12)' },
  hot_lead:       { label: 'Hot Lead',   color: '#F97316', bg: 'rgba(249,115,22,0.12)' },
  demo_scheduled: { label: 'Demo',       color: '#D97706', bg: 'rgba(217,119,6,0.12)'  },
  customer:       { label: 'Customer',   color: '#22C55E', bg: 'rgba(34,197,94,0.12)'  },
  competitor:     { label: 'Competitor', color: '#EF4444', bg: 'rgba(239,68,68,0.12)'  },
}

const CHECKIN_TYPE_COLOR: Record<CheckInType, string> = {
  visit:     '#3B82F6',
  demo:      '#D97706',
  workshop:  '#8B5CF6',
  start_day: '#22C55E',
  end_day:   '#EF4444',
}

type DrawerTab = 'overview' | 'coffee' | 'activity'
type EditableField = 'coffee_machine' | 'current_bean_brand' | 'quoted_bean_name'
type NumericField = 'bean_usage_kg' | 'bean_price_per_kg' | 'cappuccino_price' | 'quoted_price'

const inputClass =
  'w-full rounded-lg border border-[#2A2A2A] bg-[#111] px-3 py-2 text-sm text-white outline-none focus:border-[#D97706] focus:ring-1 focus:ring-amber-600/20 transition-colors'

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
  const [checkins, setCheckins] = useState<CheckIn[]>([])
  const [checkinsLoading, setCheckinsLoading] = useState(false)

  // Sync localLead when lead prop changes
  useEffect(() => {
    if (lead) setLocalLead(lead)
  }, [lead])

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    if (isOpen) document.addEventListener('keydown', handleEsc)
    return () => document.removeEventListener('keydown', handleEsc)
  }, [isOpen, onClose])

  // Measure tab underline
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

  // Load checkins on drawer open or after a new checkin (refreshTrigger)
  useEffect(() => {
    if (!lead?.id) return
    setCheckinsLoading(true)
    fetch(`/api/leads/${lead.id}/checkins`)
      .then(r => r.json())
      .then((d: { checkins: CheckIn[] }) => setCheckins(d.checkins ?? []))
      .catch(() => setCheckins([]))
      .finally(() => setCheckinsLoading(false))
  }, [lead?.id, refreshTrigger])

  async function handleSave() {
    if (!localLead) return
    setSaving(true)
    try {
      const res = await fetch(`/api/leads/${localLead.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: localLead.status,
          location_address: localLead.location_address,
          poc_name: localLead.poc_name,
          poc_contact: localLead.poc_contact,
          remarks: localLead.remarks,
          coffee_machine: localLead.coffee_machine,
          current_bean_brand: localLead.current_bean_brand,
          bean_usage_kg: localLead.bean_usage_kg,
          bean_price_per_kg: localLead.bean_price_per_kg,
          cappuccino_price: localLead.cappuccino_price,
          quoted_price: localLead.quoted_price,
          quoted_bean_name: localLead.quoted_bean_name,
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

  // Helper: editable text row
  function EditableText({ field, label, value }: { field: EditableField; label: string; value: string | undefined }) {
    return (
      <div>
        <p className="mb-1 text-[11px] text-[#555]">{label}</p>
        {editingField === field ? (
          <input
            type="text"
            defaultValue={value ?? ''}
            className={inputClass}
            autoFocus
            onBlur={e => {
              setLocalLead(prev => prev ? { ...prev, [field]: e.target.value || undefined } : prev)
              setEditingField(null)
            }}
          />
        ) : (
          <p
            className="cursor-pointer text-[13px] text-[#E5E5E5] hover:text-white"
            onClick={() => setEditingField(field)}
          >
            {value || '—'}
          </p>
        )}
      </div>
    )
  }

  // Helper: editable numeric row
  function EditableNumber({ field, label, value }: { field: NumericField; label: string; value: number | undefined }) {
    return (
      <div>
        <p className="mb-1 text-[11px] text-[#555]">{label}</p>
        {editingField === field ? (
          <input
            type="number"
            defaultValue={value ?? ''}
            className={inputClass}
            autoFocus
            onBlur={e => {
              const n = parseFloat(e.target.value)
              setLocalLead(prev => prev ? { ...prev, [field]: isNaN(n) ? undefined : n } : prev)
              setEditingField(null)
            }}
          />
        ) : (
          <p
            className="cursor-pointer text-[13px] text-[#E5E5E5] hover:text-white"
            onClick={() => setEditingField(field)}
          >
            {value !== undefined ? value : '—'}
          </p>
        )}
      </div>
    )
  }

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60"
          onClick={onClose}
        />
      )}

      {/* Drawer panel */}
      <div
        className={`fixed right-0 top-0 z-50 flex h-full w-full flex-col bg-[#141414] transition-transform duration-200 md:w-[400px] md:border-l md:border-[#2A2A2A] ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="border-b border-[#1E1E1E] p-4">
          <div className="flex items-start justify-between gap-2">
            <p className="text-[16px] font-bold leading-tight text-white">{localLead.cafe_name}</p>
            <span
              className="flex-shrink-0 rounded-md px-2 py-0.5 text-[11px] font-medium"
              style={{ backgroundColor: statusMeta.bg, color: statusMeta.color }}
            >
              {statusMeta.label}
            </span>
          </div>

          <div className="mt-2 flex items-center gap-2">
            {localLead.latitude && localLead.longitude && (
              <button
                type="button"
                onClick={() =>
                  window.open(
                    `https://www.google.com/maps/dir/?api=1&destination=${localLead.latitude},${localLead.longitude}`,
                    '_blank'
                  )
                }
                className="flex items-center gap-1.5 rounded-lg border border-amber-600/30 px-3 py-1.5 text-[12px] font-medium text-[#D97706] hover:bg-amber-600/10 transition-colors"
              >
                <MapPin size={13} />
                Navigate
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="ml-auto rounded-lg border border-[#2A2A2A] p-1.5 text-[#7A7A7A] hover:text-white transition-colors"
            >
              <X size={14} />
            </button>
          </div>

          {/* Tab bar */}
          <div className="relative mt-3 flex gap-5 border-b border-[#1E1E1E]">
            {([
              { key: 'overview' as DrawerTab, label: 'Overview',       ref: overviewRef  },
              { key: 'coffee'   as DrawerTab, label: 'Coffee Details',  ref: coffeeRef    },
              { key: 'activity' as DrawerTab, label: 'Activity',        ref: activityRef  },
            ] as const).map(({ key, label, ref }) => (
              <button
                key={key}
                ref={ref}
                type="button"
                onClick={() => setActiveTab(key)}
                className={`pb-2.5 text-[13px] transition-colors ${
                  activeTab === key ? 'font-medium text-white' : 'text-[#555]'
                }`}
              >
                {label}
              </button>
            ))}
            <div
              className="absolute bottom-[-1px] h-0.5 rounded-sm bg-[#D97706] transition-all duration-200"
              style={{ left: underline.left, width: underline.width }}
            />
          </div>
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto">
          {/* ── Overview ── */}
          {activeTab === 'overview' && (
            <div className="flex flex-col gap-4 p-4">
              <div className="flex items-start gap-2">
                <MapPin size={15} className="mt-0.5 flex-shrink-0 text-[#555]" />
                <p className="text-[13px] text-[#E5E5E5]">
                  {localLead.location_address || 'No address'}
                </p>
              </div>

              <div className="flex items-center gap-3 text-[13px]">
                <span className="text-[#7A7A7A]">{localLead.poc_name || '—'}</span>
                {localLead.poc_contact && (
                  <a
                    href={`tel:${localLead.poc_contact}`}
                    className="text-[#D97706] hover:text-[#B45309] transition-colors"
                  >
                    {localLead.poc_contact}
                  </a>
                )}
              </div>

              {/* Status */}
              <div>
                <p className="mb-1.5 text-[12px] font-medium text-[#A0A0A0]">Status</p>
                <select
                  value={localLead.status}
                  onChange={e =>
                    setLocalLead(prev => prev ? { ...prev, status: e.target.value as LeadStatus } : prev)
                  }
                  className={`${inputClass} cursor-pointer`}
                >
                  <option value="cold_lead">Cold Lead</option>
                  <option value="hot_lead">Hot Lead</option>
                  <option value="demo_scheduled">Demo Scheduled</option>
                  <option value="customer">Customer</option>
                  <option value="competitor">Competitor</option>
                </select>
              </div>

              {/* Remarks */}
              <div>
                <p className="mb-1.5 text-[12px] font-medium text-[#A0A0A0]">Remarks</p>
                <textarea
                  rows={3}
                  value={localLead.remarks ?? ''}
                  onChange={e =>
                    setLocalLead(prev => prev ? { ...prev, remarks: e.target.value || undefined } : prev)
                  }
                  className={`${inputClass} resize-none`}
                  placeholder="Add notes…"
                />
              </div>

              <p className="text-[11px] text-[#555]">
                Updated {formatDistanceToNow(new Date(localLead.updated_at), { addSuffix: true })}
              </p>
            </div>
          )}

          {/* ── Coffee Details ── */}
          {activeTab === 'coffee' && (
            <div className="flex flex-col gap-3.5 p-4">
              <EditableText field="coffee_machine"    label="Coffee Machine"     value={localLead.coffee_machine} />
              <EditableText field="current_bean_brand" label="Current Bean Brand" value={localLead.current_bean_brand} />

              <div className="grid grid-cols-2 gap-3">
                <EditableNumber field="bean_usage_kg"    label="Bean Usage (kg)"      value={localLead.bean_usage_kg} />
                <EditableNumber field="bean_price_per_kg" label="Bean Price / kg"      value={localLead.bean_price_per_kg} />
                <EditableNumber field="cappuccino_price"  label="Cappuccino Price"     value={localLead.cappuccino_price} />
                <EditableNumber field="quoted_price"      label="Quoted Price"         value={localLead.quoted_price} />
              </div>

              <EditableText field="quoted_bean_name" label="Quoted Bean" value={localLead.quoted_bean_name} />
            </div>
          )}

          {/* ── Activity ── */}
          {activeTab === 'activity' && (
            <div className="p-4">
              {checkinsLoading ? (
                <p className="text-[13px] text-[#555]">Loading…</p>
              ) : checkins.length === 0 ? (
                <p className="text-[13px] text-[#555]">No check-ins yet for this lead.</p>
              ) : (
                <div className="relative pl-5">
                  <div className="absolute left-[6px] top-2 bottom-2 w-px bg-[#2A2A2A]" />
                  {checkins.map(c => (
                    <div key={c.id} className="relative mb-4 last:mb-0">
                      <span
                        className="absolute -left-[18px] top-0.5 h-2 w-2 rounded-full"
                        style={{ backgroundColor: CHECKIN_TYPE_COLOR[c.type] }}
                      />
                      <p className="text-[11px] text-[#555]">
                        {formatDistanceToNow(new Date(c.created_at), { addSuffix: true })} · {c.user_name}
                      </p>
                      <div className="mt-0.5 flex items-center gap-1.5">
                        <span
                          className="rounded px-1.5 py-0.5 text-[10px] font-medium capitalize"
                          style={{
                            backgroundColor: `${CHECKIN_TYPE_COLOR[c.type]}20`,
                            color: CHECKIN_TYPE_COLOR[c.type],
                          }}
                        >
                          {c.type.replace('_', ' ')}
                        </span>
                        {c.remarks && (
                          <span className="text-[12px] text-[#7A7A7A]">{c.remarks}</span>
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
        <div className="border-t border-[#1E1E1E] p-4">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#D97706] py-2.5 text-sm font-semibold text-white hover:bg-[#B45309] disabled:opacity-50 transition-colors"
          >
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="mt-2 w-full text-center text-[13px] text-red-500 hover:text-red-400 disabled:opacity-50 transition-colors"
          >
            {deleting ? 'Deleting…' : 'Delete Lead'}
          </button>
        </div>
      </div>
    </>
  )
}

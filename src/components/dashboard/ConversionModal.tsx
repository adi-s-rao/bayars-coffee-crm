'use client'

import { useRef, useState } from 'react'
import { ChevronDown, Loader2, X } from 'lucide-react'
import { toast } from 'sonner'
import { COFFEE_SKUS, type Lead } from '@/types'

interface Props {
  lead: Lead
  isOpen: boolean
  onClose: () => void
  onConverted: (updatedLead: Lead) => void
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'var(--bg-input)',
  borderRadius: '10px',
  border: 'none',
  padding: '12px 14px',
  fontSize: '15px',
  color: 'var(--label-primary)',
  outline: 'none',
  boxSizing: 'border-box',
  fontFamily: 'inherit',
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  marginBottom: '6px',
  fontSize: '13px',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  color: 'var(--label-tertiary)',
}

export default function ConversionModal({ lead, isOpen, onClose, onConverted }: Props) {
  const [beansKg, setBeansKg] = useState('')
  const [beanType, setBeanType] = useState('')
  const [skuSearch, setSkuSearch] = useState('')
  const [skuOpen, setSkuOpen] = useState(false)
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const skuRef = useRef<HTMLDivElement>(null)

  if (!isOpen) return null

  const filteredSkus = COFFEE_SKUS.filter(s =>
    s.toLowerCase().includes(skuSearch.toLowerCase())
  )

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    try {
      // 1. PATCH lead status to customer
      const patchRes = await fetch(`/api/leads/${lead.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'customer' }),
      })
      if (!patchRes.ok) throw new Error('Status update failed')
      const { lead: updatedLead } = await patchRes.json() as { lead: Lead }

      // 2. POST conversion record
      await fetch('/api/conversions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lead_id: lead.id,
          beans_ordered_kg: beansKg ? parseFloat(beansKg) : undefined,
          bean_type: beanType || undefined,
          notes: notes || undefined,
        }),
      })

      toast.success(`${lead.cafe_name} converted to customer!`)
      onConverted(updatedLead)
    } catch {
      toast.error('Failed to record conversion')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 flex items-end justify-center md:items-center" style={{ zIndex: 1200 }}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div
        className="relative z-10 w-full overflow-y-auto md:mx-4 md:max-w-md md:rounded-3xl"
        style={{ background: 'var(--bg-card)', borderRadius: '24px 24px 0 0', padding: '24px', paddingBottom: 90, maxHeight: '85vh' }}
      >
        <div style={{ width: '36px', height: '4px', borderRadius: '2px', background: 'rgba(235,235,245,0.2)', margin: '0 auto 20px' }} className="md:hidden" />

        {/* Header */}
        <div style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#30D158' }}>🎉 Conversion!</h2>
            <p style={{ fontSize: '14px', color: 'var(--label-tertiary)', marginTop: '2px' }}>{lead.cafe_name} is now a customer</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'rgba(118,118,128,0.15)', border: 'none', borderRadius: '10px', padding: '8px', color: 'rgba(235,235,245,0.6)', cursor: 'pointer' }}
          >
            <X size={16} />
          </button>
        </div>

        <div style={{ height: '0.5px', background: 'var(--separator)', margin: '16px 0' }} />

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Bean type SKU */}
          <div ref={skuRef} style={{ position: 'relative' }}>
            <label style={labelStyle}>Bean Type Ordered</label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                placeholder="Search SKU…"
                value={skuSearch || beanType}
                onChange={e => { setSkuSearch(e.target.value); setBeanType(''); setSkuOpen(true) }}
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
                    onMouseDown={() => { setBeanType(sku); setSkuSearch(''); setSkuOpen(false) }}
                    style={{ width: '100%', textAlign: 'left', padding: '10px 14px', background: 'none', border: 'none', fontSize: '14px', color: 'var(--label-primary)', cursor: 'pointer', borderBottom: '0.5px solid var(--separator)' }}
                  >
                    {sku}
                  </button>
                ))}
              </div>
            )}
            {beanType && (
              <p style={{ marginTop: '4px', fontSize: '12px', color: '#30D158' }}>✓ {beanType}</p>
            )}
          </div>

          {/* Beans kg */}
          <div>
            <label style={labelStyle}>Beans Ordered (kg)</label>
            <input
              type="number"
              min="0"
              step="0.5"
              placeholder="0.0"
              value={beansKg}
              onChange={e => setBeansKg(e.target.value)}
              style={inputStyle}
              className="placeholder:text-[rgba(235,235,245,0.3)]"
            />
          </div>

          {/* Notes */}
          <div>
            <label style={labelStyle}>Notes</label>
            <textarea
              rows={3}
              placeholder="Any additional notes…"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              style={{ ...inputStyle, resize: 'none' }}
              className="placeholder:text-[rgba(235,235,245,0.3)]"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="flex items-center justify-center gap-2 transition-all active:scale-[0.97]"
            style={{ width: '100%', height: '54px', borderRadius: '14px', background: '#30D158', color: '#FFF', fontSize: '17px', fontWeight: 600, border: 'none', cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.6 : 1 }}
          >
            {submitting && <Loader2 size={18} className="animate-spin" />}
            {submitting ? 'Recording…' : 'Record Conversion'}
          </button>

          <button
            type="button"
            onClick={onClose}
            style={{ width: '100%', textAlign: 'center', fontSize: '15px', color: 'var(--label-tertiary)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0' }}
          >
            Skip for now
          </button>
        </form>
      </div>
    </div>
  )
}

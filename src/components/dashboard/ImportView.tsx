'use client'

import { useRef, useState } from 'react'
import { CheckCircle, Download, Upload, X } from 'lucide-react'
import Papa from 'papaparse'
import { useRouter } from 'next/navigation'

const DB_FIELDS: { key: string; label: string; required?: boolean; hint?: string }[] = [
  { key: 'cafe_name',            label: 'Cafe Name',           required: true },
  { key: 'status',               label: 'Status',              required: true, hint: 'cold_lead, hot_lead, customer, competitor' },
  { key: 'location_address',     label: 'Address' },
  { key: 'poc_name',             label: 'Contact Name' },
  { key: 'poc_contact',          label: 'Contact Phone' },
  { key: 'coffee_machine',       label: 'Coffee Machine' },
  { key: 'current_bean_brand',   label: 'Bean Brand' },
  { key: 'bean_usage_kg',        label: 'Bean Usage (kg)' },
  { key: 'cappuccino_price',     label: 'Cappuccino Price' },
  { key: 'sample_name',          label: 'Sample SKU' },
  { key: 'sample_quantity_grams', label: 'Sample Qty (g)' },
  { key: 'remarks',              label: 'Remarks' },
]

function autoMatch(csvHeader: string): string {
  const h = csvHeader.toLowerCase().replace(/[\s_-]+/g, '')
  const candidates: [string, string][] = [
    ['cafename', 'cafe_name'], ['name', 'cafe_name'],
    ['status', 'status'],
    ['address', 'location_address'], ['location', 'location_address'],
    ['contactname', 'poc_name'], ['pocname', 'poc_name'], ['contact', 'poc_name'],
    ['phone', 'poc_contact'], ['poccontact', 'poc_contact'], ['mobile', 'poc_contact'],
    ['machine', 'coffee_machine'], ['coffeemachine', 'coffee_machine'],
    ['beanbrand', 'current_bean_brand'], ['brand', 'current_bean_brand'],
    ['beanusage', 'bean_usage_kg'], ['usage', 'bean_usage_kg'],
    ['cappuccino', 'cappuccino_price'], ['capprice', 'cappuccino_price'],
    ['samplesku', 'sample_name'], ['samplename', 'sample_name'], ['sku', 'sample_name'],
    ['sampleqty', 'sample_quantity_grams'], ['samplegrams', 'sample_quantity_grams'],
    ['remarks', 'remarks'], ['notes', 'remarks'],
  ]
  return candidates.find(([k]) => h.includes(k))?.[1] ?? ''
}

type Step = 'upload' | 'mapping' | 'preview' | 'done'

export default function ImportView() {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [step, setStep] = useState<Step>('upload')
  const [headers, setHeaders] = useState<string[]>([])
  const [rows, setRows] = useState<Record<string, string>[]>([])
  const [columnMap, setColumnMap] = useState<Record<string, string>>({})
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<{ imported: number; failed: number; errors: string[] } | null>(null)
  const [dragOver, setDragOver] = useState(false)

  function parseFile(file: File) {
    if (!file.name.endsWith('.csv')) return
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (r) => {
        const hdrs = (r.meta.fields ?? []) as string[]
        const initial: Record<string, string> = {}
        for (const h of hdrs) {
          const match = autoMatch(h)
          if (match) initial[match] = h
        }
        setHeaders(hdrs)
        setRows(r.data as Record<string, string>[])
        setColumnMap(initial)
        setStep('mapping')
      },
    })
  }

  function handleFile(file: File | undefined) {
    if (!file) return
    parseFile(file)
  }

  function getMappedRows() {
    return rows.map(row => {
      const mapped: Record<string, string> = {}
      for (const [dbField, csvCol] of Object.entries(columnMap)) {
        if (csvCol && row[csvCol] !== undefined) {
          mapped[dbField] = row[csvCol] ?? ''
        }
      }
      return mapped
    })
  }

  async function handleImport() {
    setImporting(true)
    try {
      const mappedRows = getMappedRows()
      const res = await fetch('/api/import/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: mappedRows }),
      })
      const data = await res.json() as { imported: number; failed: number; errors: string[] }
      setResult(data)
      setStep('done')
    } catch {
      setResult({ imported: 0, failed: rows.length, errors: ['Network error'] })
      setStep('done')
    } finally {
      setImporting(false)
    }
  }

  const validCount = getMappedRows().filter(r => r['cafe_name']?.trim()).length

  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: 'var(--bg-input)',
    border: 'none',
    borderRadius: '8px',
    padding: '8px 10px',
    fontSize: '14px',
    color: 'var(--label-primary)',
    outline: 'none',
    fontFamily: 'inherit',
  }

  return (
    <div style={{ padding: '16px', paddingBottom: '100px' }}>

      {/* UPLOAD */}
      {step === 'upload' && (
        <div>
          <p style={{ marginBottom: '16px', fontSize: '22px', fontWeight: 700, color: 'var(--label-primary)' }}>
            Import Leads
          </p>
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]) }}
            onClick={() => fileRef.current?.click()}
            style={{
              border: `1.5px dashed ${dragOver ? '#D97706' : 'var(--separator)'}`,
              borderRadius: '16px',
              padding: '48px 24px',
              textAlign: 'center',
              background: dragOver ? 'rgba(217,119,6,0.05)' : 'var(--bg-input)',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            <Upload size={40} style={{ color: 'var(--label-tertiary)', margin: '0 auto 12px' }} />
            <p style={{ fontSize: '17px', color: 'var(--label-primary)', fontWeight: 500 }}>
              Drop CSV file here
            </p>
            <p style={{ marginTop: '6px', fontSize: '15px', color: 'var(--label-secondary)' }}>
              or tap to browse
            </p>
            <p style={{ marginTop: '10px', fontSize: '12px', color: 'var(--label-tertiary)' }}>
              CSV only · Max 10MB
            </p>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept=".csv"
            style={{ display: 'none' }}
            onChange={e => handleFile(e.target.files?.[0])}
          />
          <a
            href="/import-template.csv"
            download="bayars-import-template.csv"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              marginTop: '16px',
              height: '44px',
              borderRadius: '12px',
              background: 'rgba(118,118,128,0.15)',
              border: '0.5px solid var(--separator)',
              fontSize: '15px',
              fontWeight: 500,
              color: 'var(--label-secondary)',
              textDecoration: 'none',
            }}
          >
            <Download size={15} />
            Download Template
          </a>
        </div>
      )}

      {/* MAPPING */}
      {step === 'mapping' && (
        <div>
          <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <p style={{ fontSize: '22px', fontWeight: 700, color: 'var(--label-primary)' }}>Map Columns</p>
            <button
              type="button"
              onClick={() => setStep('upload')}
              style={{ background: 'none', border: 'none', color: 'var(--label-tertiary)', cursor: 'pointer' }}
            >
              <X size={20} />
            </button>
          </div>
          <p style={{ marginBottom: '16px', fontSize: '13px', color: 'var(--label-secondary)' }}>
            {rows.length} rows detected · Map your CSV columns to our fields
          </p>

          <div style={{ background: 'var(--bg-card)', borderRadius: '16px', overflow: 'hidden', marginBottom: '16px' }}>
            {DB_FIELDS.map((field, i) => (
              <div key={field.key}>
                {i > 0 && <div style={{ height: '0.5px', background: 'var(--separator)', margin: '0 16px' }} />}
                <div style={{ padding: '12px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '6px' }}>
                    <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--label-primary)' }}>
                      {field.label}
                    </span>
                    {field.required && (
                      <span style={{ fontSize: '11px', color: '#FF453A' }}>*</span>
                    )}
                  </div>
                  {field.hint && (
                    <p style={{ fontSize: '11px', color: 'var(--label-tertiary)', marginBottom: '6px' }}>
                      {field.hint}
                    </p>
                  )}
                  <select
                    value={columnMap[field.key] ?? ''}
                    onChange={e => setColumnMap(prev => ({ ...prev, [field.key]: e.target.value }))}
                    style={{ ...inputStyle, colorScheme: 'dark' }}
                  >
                    <option value="">— skip —</option>
                    {headers.map(h => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setStep('preview')}
            disabled={!columnMap['cafe_name']}
            style={{
              width: '100%',
              height: '50px',
              borderRadius: '14px',
              background: '#D97706',
              color: '#FFF',
              fontSize: '17px',
              fontWeight: 600,
              border: 'none',
              cursor: !columnMap['cafe_name'] ? 'not-allowed' : 'pointer',
              opacity: !columnMap['cafe_name'] ? 0.5 : 1,
              fontFamily: 'inherit',
            }}
          >
            Preview Import
          </button>
        </div>
      )}

      {/* PREVIEW */}
      {step === 'preview' && (
        <div>
          <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              type="button"
              onClick={() => setStep('mapping')}
              style={{ background: 'none', border: 'none', color: '#0A84FF', fontSize: '17px', cursor: 'pointer', fontFamily: 'inherit' }}
            >
              ← Back
            </button>
            <p style={{ fontSize: '22px', fontWeight: 700, color: 'var(--label-primary)' }}>Preview</p>
          </div>
          <p style={{ marginBottom: '16px', fontSize: '13px', color: 'var(--label-secondary)' }}>
            {validCount} valid rows ready to import
          </p>

          <div style={{ background: 'var(--bg-card)', borderRadius: '16px', overflow: 'hidden', marginBottom: '16px' }}>
            {getMappedRows().slice(0, 5).map((row, i) => (
              <div key={i}>
                {i > 0 && <div style={{ height: '0.5px', background: 'var(--separator)', margin: '0 16px' }} />}
                <div style={{ padding: '12px 16px' }}>
                  <p style={{ fontSize: '15px', fontWeight: 600, color: 'var(--label-primary)' }}>
                    {row['cafe_name'] ?? '—'}
                  </p>
                  <p style={{ fontSize: '13px', color: 'var(--label-secondary)', marginTop: '2px' }}>
                    {row['status'] ?? 'cold_lead'}
                    {row['poc_name'] ? ` · ${row['poc_name']}` : ''}
                  </p>
                </div>
              </div>
            ))}
            {rows.length > 5 && (
              <div style={{ padding: '10px 16px', borderTop: '0.5px solid var(--separator)' }}>
                <p style={{ fontSize: '13px', color: 'var(--label-tertiary)' }}>
                  + {rows.length - 5} more rows…
                </p>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => void handleImport()}
            disabled={importing || validCount === 0}
            style={{
              width: '100%',
              height: '50px',
              borderRadius: '14px',
              background: '#D97706',
              color: '#FFF',
              fontSize: '17px',
              fontWeight: 600,
              border: 'none',
              cursor: importing || validCount === 0 ? 'not-allowed' : 'pointer',
              opacity: importing || validCount === 0 ? 0.5 : 1,
              fontFamily: 'inherit',
            }}
          >
            {importing ? 'Importing…' : `Import ${validCount} Leads`}
          </button>
        </div>
      )}

      {/* DONE */}
      {step === 'done' && result && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '48px 24px', textAlign: 'center', gap: '16px' }}>
          <CheckCircle size={48} style={{ color: result.imported > 0 ? '#30D158' : '#FF453A' }} />
          <p style={{ fontSize: '22px', fontWeight: 700, color: 'var(--label-primary)' }}>
            {result.imported > 0 ? `Imported ${result.imported} leads!` : 'Import failed'}
          </p>
          {result.failed > 0 && (
            <p style={{ fontSize: '15px', color: '#FF453A' }}>
              {result.failed} rows failed
            </p>
          )}
          {result.errors.length > 0 && (
            <div style={{ width: '100%', background: 'var(--bg-card)', borderRadius: '12px', padding: '12px 16px', textAlign: 'left' }}>
              {result.errors.map((e, i) => (
                <p key={i} style={{ fontSize: '12px', color: '#FF453A', marginTop: i > 0 ? '4px' : 0 }}>{e}</p>
              ))}
            </div>
          )}
          <button
            type="button"
            onClick={() => router.push('/dashboard')}
            style={{
              width: '100%',
              height: '50px',
              borderRadius: '14px',
              background: '#D97706',
              color: '#FFF',
              fontSize: '17px',
              fontWeight: 600,
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            Go to Dashboard
          </button>
        </div>
      )}
    </div>
  )
}

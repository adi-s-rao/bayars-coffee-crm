'use client'

import { useEffect, useRef } from 'react'
import { ChevronRight } from 'lucide-react'

export type PickerMode = 'date' | 'time' | 'datetime'

interface Props {
  value: Date | null
  onChange: (date: Date) => void
  mode: PickerMode
  label: string
  placeholder?: string
  isOpen: boolean
  onOpen: () => void
  onClose: () => void
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const YEARS = ['2024', '2025', '2026', '2027', '2028']
const HOURS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12']
const MINUTES = ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55']
const PERIODS = ['AM', 'PM']

const ITEM_H = 44
const PAD = ITEM_H * 2  // 2 ghost items top and bottom so centre item is selectable

function getDaysInMonth(month: number, year: number) {
  return new Date(year, month + 1, 0).getDate()
}

function PickerCol({
  items,
  selectedIdx,
  onSelect,
}: {
  items: string[]
  selectedIdx: number
  onSelect: (i: number) => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const userScrolling = useRef(false)

  // Scroll to selected on mount / external change
  useEffect(() => {
    if (!ref.current || userScrolling.current) return
    ref.current.scrollTop = selectedIdx * ITEM_H
  }, [selectedIdx])

  function handleScroll() {
    if (!ref.current) return
    userScrolling.current = true
    const idx = Math.round(ref.current.scrollTop / ITEM_H)
    const clamped = Math.max(0, Math.min(idx, items.length - 1))
    if (clamped !== selectedIdx) onSelect(clamped)
    clearTimeout((ref.current as HTMLDivElement & { _t?: ReturnType<typeof setTimeout> })._t)
    ;(ref.current as HTMLDivElement & { _t?: ReturnType<typeof setTimeout> })._t = setTimeout(() => {
      userScrolling.current = false
    }, 150)
  }

  return (
    <div style={{ flex: 1, position: 'relative', overflow: 'hidden', height: `${ITEM_H * 5}px` }}>
      {/* fade gradients */}
      <div
        style={{
          position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none',
          background: 'linear-gradient(to bottom, var(--bg-card) 0%, transparent 35%, transparent 65%, var(--bg-card) 100%)',
        }}
      />
      {/* selection indicator */}
      <div
        style={{
          position: 'absolute', left: 0, right: 0, zIndex: 2, pointerEvents: 'none',
          top: `${ITEM_H * 2}px`, height: `${ITEM_H}px`,
          borderTop: '0.5px solid var(--separator)',
          borderBottom: '0.5px solid var(--separator)',
        }}
      />
      <div
        ref={ref}
        onScroll={handleScroll}
        style={{
          height: '100%',
          overflowY: 'scroll',
          scrollSnapType: 'y mandatory',
          paddingTop: `${PAD}px`,
          paddingBottom: `${PAD}px`,
          scrollbarWidth: 'none',
        }}
      >
        {items.map((item, i) => {
          const dist = Math.abs(i - selectedIdx)
          return (
            <div
              key={item}
              onClick={() => {
                if (ref.current) ref.current.scrollTop = i * ITEM_H
                onSelect(i)
              }}
              style={{
                height: `${ITEM_H}px`,
                scrollSnapAlign: 'center',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: i === selectedIdx ? '20px' : '17px',
                fontWeight: i === selectedIdx ? 600 : 400,
                color: dist === 0
                  ? 'var(--label-primary)'
                  : dist === 1
                  ? 'var(--label-secondary)'
                  : 'var(--label-quaternary)',
                cursor: 'pointer',
                transition: 'font-size 0.1s ease, color 0.1s ease',
                userSelect: 'none',
              }}
            >
              {item}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function DateTimePicker({
  value,
  onChange,
  mode,
  label,
  placeholder,
  isOpen,
  onOpen,
  onClose,
}: Props) {
  const now = value ?? new Date()
  const h12 = now.getHours() % 12 || 12

  // Date state
  const monthIdx = useRef(now.getMonth())
  const dayIdx   = useRef(now.getDate() - 1)
  const yearIdx  = useRef(Math.max(0, YEARS.indexOf(String(now.getFullYear()))))
  // Time state
  const hourIdx   = useRef(h12 - 1)
  const minuteIdx = useRef(Math.floor(now.getMinutes() / 5))
  const periodIdx = useRef(now.getHours() >= 12 ? 1 : 0)

  const currentYear = parseInt(YEARS[yearIdx.current] ?? '2026')
  const days = Array.from(
    { length: getDaysInMonth(monthIdx.current, currentYear) },
    (_, i) => String(i + 1)
  )

  function handleDone() {
    const year  = parseInt(YEARS[yearIdx.current] ?? '2026')
    const month = monthIdx.current
    const maxDay = getDaysInMonth(month, year)
    const day   = Math.min(dayIdx.current + 1, maxDay)
    const h12v  = (hourIdx.current % 12) + 1
    const pm    = periodIdx.current === 1
    const hour24 = pm ? (h12v === 12 ? 12 : h12v + 12) : (h12v === 12 ? 0 : h12v)
    const minute = parseInt(MINUTES[minuteIdx.current] ?? '0')

    let d: Date
    if (mode === 'time') {
      d = value ? new Date(value) : new Date()
      d.setHours(hour24, minute, 0, 0)
    } else if (mode === 'date') {
      d = new Date(year, month, day, 0, 0, 0, 0)
    } else {
      d = new Date(year, month, day, hour24, minute, 0, 0)
    }
    onChange(d)
    onClose()
  }

  function formatDisplay(): string {
    if (!value) return placeholder ?? 'Select…'
    if (mode === 'time') {
      return value.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
    }
    if (mode === 'date') {
      return value.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    }
    return value.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
  }

  const showDate = mode === 'date' || mode === 'datetime'
  const showTime = mode === 'time' || mode === 'datetime'

  return (
    <>
      <button
        type="button"
        onClick={onOpen}
        style={{
          width: '100%',
          padding: '14px 16px',
          background: 'var(--bg-input)',
          borderRadius: '10px',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontFamily: 'inherit',
        }}
      >
        <span style={{ fontSize: '17px', color: 'var(--label-primary)' }}>{label}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ fontSize: '17px', color: value ? 'var(--accent)' : 'var(--label-quaternary)' }}>
            {formatDisplay()}
          </span>
          <ChevronRight size={16} style={{ color: 'var(--label-tertiary)' }} />
        </div>
      </button>

      {isOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200 }}>
          <div
            style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)' }}
            onClick={onClose}
          />
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              background: 'var(--bg-card)',
              borderRadius: '20px 20px 0 0',
            }}
          >
            <div
              style={{
                width: '36px', height: '4px', borderRadius: '2px',
                background: 'rgba(235,235,245,0.2)',
                margin: '12px auto 0',
              }}
            />
            {/* Header */}
            <div
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '12px 20px',
                borderBottom: '0.5px solid var(--separator)',
              }}
            >
              <button
                type="button"
                onClick={onClose}
                style={{
                  fontSize: '17px', color: '#0A84FF',
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontFamily: 'inherit', padding: '4px 0',
                }}
              >
                Cancel
              </button>
              <span style={{ fontSize: '17px', fontWeight: 600, color: 'var(--label-primary)' }}>
                {label}
              </span>
              <button
                type="button"
                onClick={handleDone}
                style={{
                  fontSize: '17px', fontWeight: 600, color: 'var(--accent)',
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontFamily: 'inherit', padding: '4px 0',
                }}
              >
                Done
              </button>
            </div>

            {/* Columns */}
            <div style={{ display: 'flex', padding: '0 16px 32px', gap: '4px' }}>
              {showDate && (
                <>
                  <PickerCol
                    items={MONTHS}
                    selectedIdx={monthIdx.current}
                    onSelect={i => { monthIdx.current = i }}
                  />
                  <PickerCol
                    items={days}
                    selectedIdx={Math.min(dayIdx.current, days.length - 1)}
                    onSelect={i => { dayIdx.current = i }}
                  />
                  <PickerCol
                    items={YEARS}
                    selectedIdx={yearIdx.current}
                    onSelect={i => { yearIdx.current = i }}
                  />
                </>
              )}
              {showTime && (
                <>
                  <PickerCol
                    items={HOURS}
                    selectedIdx={hourIdx.current}
                    onSelect={i => { hourIdx.current = i }}
                  />
                  <PickerCol
                    items={MINUTES}
                    selectedIdx={minuteIdx.current}
                    onSelect={i => { minuteIdx.current = i }}
                  />
                  <PickerCol
                    items={PERIODS}
                    selectedIdx={periodIdx.current}
                    onSelect={i => { periodIdx.current = i }}
                  />
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

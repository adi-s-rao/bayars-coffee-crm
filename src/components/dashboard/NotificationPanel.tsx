'use client'

import { AlertCircle, AlertTriangle, Calendar, CheckCircle } from 'lucide-react'
import type { Profile } from '@/types'
import { format } from 'date-fns'
import { useTheme } from '@/contexts/ThemeContext'

const TYPE_COLOR: Record<string, string> = {
  visit:    '#0A84FF',
  demo:     '#D97706',
  workshop: '#8B5CF6',
}

function parseFlagDistance(remarks: string): string {
  const match = /\[FLAGGED: (\d+)m away\]/.exec(remarks)
  return match ? `${match[1]}m away` : 'flagged'
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

interface ScheduledItem {
  id: string
  cafe_name: string
  scheduled_date: string
  scheduled_type: string
}

interface FlaggedItem {
  id: string
  user_name: string
  remarks: string
  created_at: string
  leads: { cafe_name: string } | null
}

interface RepNotStarted {
  id: string
  full_name: string
  initials: string
}

interface RepPayload {
  type: 'rep'
  scheduledToday: ScheduledItem[]
}

interface ManagerPayload {
  type: 'manager'
  flaggedCheckins: FlaggedItem[]
  repsNotStarted: RepNotStarted[]
}

type Payload = RepPayload | ManagerPayload | null

interface Props {
  payload: Payload
  profile: Profile
  onClose: () => void
}

export default function NotificationPanel({ payload, profile: _profile, onClose }: Props) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  const sectionLabel: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '10px 16px 6px',
    fontSize: '11px',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    color: 'var(--label-tertiary)',
  }

  let content: React.ReactNode

  if (!payload) {
    content = (
      <div style={{ padding: '32px 16px', textAlign: 'center' }}>
        <p style={{ fontSize: '14px', color: 'var(--label-tertiary)' }}>Loading…</p>
      </div>
    )
  } else if (payload.type === 'rep') {
    const { scheduledToday } = payload
    if (scheduledToday.length === 0) {
      content = (
        <div style={{ padding: '32px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
          <Calendar size={28} style={{ color: 'var(--label-tertiary)' }} />
          <p style={{ fontSize: '14px', color: 'var(--label-tertiary)' }}>No visits scheduled today</p>
        </div>
      )
    } else {
      content = (
        <>
          <div style={sectionLabel}>
            <Calendar size={12} />
            Today&apos;s Schedule
          </div>
          <div style={{ background: 'var(--bg-card)', margin: '0 12px', borderRadius: '12px', overflow: 'hidden' }}>
            {scheduledToday.map((item, i) => (
              <div key={item.id}>
                {i > 0 && <div style={{ height: '0.5px', background: 'var(--separator)', margin: '0 14px' }} />}
                <div
                  style={{
                    padding: '12px 14px',
                    borderLeft: `3px solid ${TYPE_COLOR[item.scheduled_type] ?? '#D97706'}`,
                  }}
                >
                  <p style={{ fontSize: '15px', fontWeight: 600, color: 'var(--label-primary)' }}>
                    {item.cafe_name}
                  </p>
                  <p style={{ fontSize: '13px', color: 'var(--label-secondary)', marginTop: '2px' }}>
                    {format(new Date(item.scheduled_date), 'h:mm a')}
                    {' · '}
                    <span style={{ textTransform: 'capitalize' }}>{item.scheduled_type}</span>
                  </p>
                </div>
              </div>
            ))}
          </div>
        </>
      )
    }
  } else {
    const { flaggedCheckins, repsNotStarted } = payload
    const hasNothing = flaggedCheckins.length === 0 && repsNotStarted.length === 0

    if (hasNothing) {
      content = (
        <div style={{ padding: '32px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
          <CheckCircle size={28} style={{ color: '#30D158' }} />
          <p style={{ fontSize: '14px', color: 'var(--label-tertiary)' }}>All good! No alerts today</p>
        </div>
      )
    } else {
      content = (
        <>
          {repsNotStarted.length > 0 && (
            <>
              <div style={{ ...sectionLabel, color: '#FF9F0A' }}>
                <AlertCircle size={12} />
                Haven&apos;t Started
              </div>
              <div style={{ background: 'var(--bg-card)', margin: '0 12px', borderRadius: '12px', overflow: 'hidden' }}>
                {repsNotStarted.map((rep, i) => (
                  <div key={rep.id}>
                    {i > 0 && <div style={{ height: '0.5px', background: 'var(--separator)', margin: '0 14px' }} />}
                    <div style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div
                        style={{
                          width: '32px', height: '32px', borderRadius: '50%', flexShrink: 0,
                          background: 'rgba(255,159,10,0.15)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}
                      >
                        <span style={{ fontSize: '12px', fontWeight: 600, color: '#FF9F0A' }}>
                          {rep.initials}
                        </span>
                      </div>
                      <div>
                        <p style={{ fontSize: '15px', fontWeight: 500, color: 'var(--label-primary)' }}>
                          {rep.full_name}
                        </p>
                        <p style={{ fontSize: '13px', color: 'var(--label-tertiary)', marginTop: '1px' }}>
                          Day not started
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {flaggedCheckins.length > 0 && (
            <>
              <div style={{ ...sectionLabel, color: '#FF453A', marginTop: repsNotStarted.length > 0 ? '12px' : 0 }}>
                <AlertTriangle size={12} />
                Flagged Check-ins
              </div>
              <div style={{ background: 'var(--bg-card)', margin: '0 12px', borderRadius: '12px', overflow: 'hidden' }}>
                {flaggedCheckins.map((item, i) => (
                  <div key={item.id}>
                    {i > 0 && <div style={{ height: '0.5px', background: 'var(--separator)', margin: '0 14px' }} />}
                    <div style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                      <div style={{ minWidth: 0 }}>
                        <p style={{ fontSize: '15px', fontWeight: 500, color: 'var(--label-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {item.leads?.cafe_name ?? 'Unknown'}
                        </p>
                        <p style={{ fontSize: '13px', color: 'var(--label-secondary)', marginTop: '1px' }}>
                          {item.user_name}
                        </p>
                      </div>
                      <div style={{ flexShrink: 0, textAlign: 'right' }}>
                        <p style={{ fontSize: '12px', fontWeight: 600, color: '#FF453A' }}>
                          {parseFlagDistance(item.remarks)}
                        </p>
                        <p style={{ fontSize: '11px', color: 'var(--label-quaternary)', marginTop: '2px' }}>
                          {timeAgo(item.created_at)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )
    }
  }

  return (
    <>
      <div
        style={{ position: 'fixed', inset: 0, zIndex: 1001 }}
        onClick={onClose}
      />
      <div
        style={{
          position: 'fixed',
          top: '60px',
          right: '16px',
          width: '320px',
          maxHeight: 'calc(100vh - 80px)',
          overflowY: 'auto',
          background: isDark ? 'rgba(28,28,30,0.95)' : 'rgba(255,255,255,0.97)',
          backdropFilter: 'blur(40px) saturate(180%)',
          WebkitBackdropFilter: 'blur(40px) saturate(180%)',
          borderRadius: '16px',
          border: isDark ? '0.5px solid rgba(255,255,255,0.1)' : '0.5px solid rgba(0,0,0,0.08)',
          boxShadow: isDark
            ? '0 8px 32px rgba(0,0,0,0.5), 0 0 0 0.5px rgba(255,255,255,0.05) inset'
            : '0 8px 32px rgba(0,0,0,0.14), 0 2px 8px rgba(0,0,0,0.08)',
          zIndex: 1002,
          animation: 'slideDown 0.2s ease',
          paddingBottom: '12px',
        }}
      >
        <div
          style={{
            padding: '14px 16px',
            borderBottom: '0.5px solid var(--separator)',
          }}
        >
          <p style={{ fontSize: '17px', fontWeight: 600, color: 'var(--label-primary)' }}>
            Notifications
          </p>
        </div>
        {content}
      </div>
    </>
  )
}

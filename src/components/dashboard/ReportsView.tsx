'use client'

import { useCallback, useEffect, useState } from 'react'
import { Activity, AlertTriangle, BarChart2, TrendingUp, Users } from 'lucide-react'
import type { Profile } from '@/types'

type Period = 'today' | 'week' | 'month'

interface PipelineData {
  cold_lead: number
  hot_lead: number
  demo_scheduled: number
  customer: number
  competitor: number
}

interface RepStat {
  user_id: string
  user_name: string
  checkIns: number
  distanceKm: number
  newLeads: number
}

interface SummaryData {
  totalLeads: number
  newLeads: number
  customers: number
  checkIns: number
  pipeline: PipelineData
  repStats: RepStat[]
}

interface FlaggedCheckIn {
  id: string
  user_id: string
  user_name: string
  type: string
  remarks: string
  created_at: string
  lead_id: string | null
  leads: { cafe_name: string } | null
}

const PIPELINE_META: { key: keyof PipelineData; label: string; color: string }[] = [
  { key: 'cold_lead',      label: 'Cold Lead',  color: '#0A84FF' },
  { key: 'hot_lead',       label: 'Hot Lead',   color: '#FF9F0A' },
  { key: 'demo_scheduled', label: 'Demo',       color: '#D97706' },
  { key: 'customer',       label: 'Customer',   color: '#30D158' },
  { key: 'competitor',     label: 'Competitor', color: '#FF453A' },
]

const AVATAR_COLORS = ['#0A84FF', '#FF9F0A', '#30D158', '#BF5AF2', '#FF453A', '#64D2FF']

function parseFlagDistance(remarks: string): string {
  const match = /\[FLAGGED: (\d+)m away\]/.exec(remarks)
  return match ? `${match[1]}m away` : 'flagged'
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map(n => n[0] ?? '')
    .join('')
    .toUpperCase()
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string
  value: string
  icon: React.ReactNode
}) {
  return (
    <div
      style={{
        background: '#1C1C1E',
        borderRadius: '16px',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '13px', color: 'rgba(235,235,245,0.45)' }}>{label}</span>
        {icon}
      </div>
      <p style={{ fontSize: '28px', fontWeight: 700, color: '#FFF', letterSpacing: '-0.5px' }}>
        {value}
      </p>
    </div>
  )
}

interface Props {
  profile: Profile
}

export default function ReportsView({ profile: _profile }: Props) {
  const [period, setPeriod] = useState<Period>('week')
  const [summary, setSummary] = useState<SummaryData | null>(null)
  const [flagged, setFlagged] = useState<FlaggedCheckIn[]>([])
  const [loading, setLoading] = useState(true)
  const [flaggedLoading, setFlaggedLoading] = useState(true)

  const fetchSummary = useCallback(async (p: Period) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/reports/summary?period=${p}`)
      if (!res.ok) return
      const data = await res.json() as SummaryData
      setSummary(data)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchFlagged = useCallback(async () => {
    setFlaggedLoading(true)
    try {
      const res = await fetch('/api/reports/flagged-checkins')
      if (!res.ok) return
      const data = await res.json() as { flagged: FlaggedCheckIn[] }
      setFlagged(data.flagged ?? [])
    } catch {
      // ignore
    } finally {
      setFlaggedLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchSummary(period)
  }, [period, fetchSummary])

  useEffect(() => {
    void fetchFlagged()
  }, [fetchFlagged])

  const maxPipeline = summary
    ? Math.max(...Object.values(summary.pipeline), 1)
    : 1

  const sectionLabel: React.CSSProperties = {
    marginBottom: '12px',
    fontSize: '13px',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: 'rgba(235,235,245,0.4)',
  }

  return (
    <div style={{ background: '#000', paddingBottom: '100px' }}>

      {/* Period Selector */}
      <div style={{ padding: '16px 16px 0' }}>
        <div
          style={{
            display: 'flex',
            gap: '4px',
            background: 'rgba(118,118,128,0.12)',
            borderRadius: '12px',
            padding: '3px',
          }}
        >
          {(['today', 'week', 'month'] as Period[]).map(p => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriod(p)}
              className="flex-1 transition-all active:scale-[0.97]"
              style={{
                height: '36px',
                borderRadius: '9px',
                fontSize: '15px',
                fontWeight: period === p ? 600 : 400,
                border: 'none',
                cursor: 'pointer',
                background: period === p ? '#D97706' : 'transparent',
                color: period === p ? '#FFF' : 'rgba(235,235,245,0.5)',
              }}
            >
              {p === 'today' ? 'Today' : p === 'week' ? '7 Days' : '30 Days'}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Grid */}
      <div
        style={{
          padding: '16px',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '10px',
        }}
      >
        <StatCard
          label="Check-ins"
          value={loading ? '—' : String(summary?.checkIns ?? 0)}
          icon={<Activity size={16} color="#D97706" />}
        />
        <StatCard
          label="New Leads"
          value={loading ? '—' : String(summary?.newLeads ?? 0)}
          icon={<TrendingUp size={16} color="#0A84FF" />}
        />
        <StatCard
          label="Customers"
          value={loading ? '—' : String(summary?.customers ?? 0)}
          icon={<Users size={16} color="#30D158" />}
        />
        <StatCard
          label="Total Leads"
          value={loading ? '—' : String(summary?.totalLeads ?? 0)}
          icon={<BarChart2 size={16} color="#FF9F0A" />}
        />
      </div>

      {/* Pipeline Funnel */}
      <div style={{ padding: '0 16px 16px' }}>
        <p style={sectionLabel}>Pipeline</p>
        <div style={{ background: '#1C1C1E', borderRadius: '16px', overflow: 'hidden' }}>
          {PIPELINE_META.map((meta, index) => {
            const count = summary?.pipeline[meta.key] ?? 0
            const pct = summary ? (count / maxPipeline) * 100 : 0
            return (
              <div key={meta.key}>
                {index > 0 && (
                  <div
                    style={{
                      height: '0.5px',
                      background: 'rgba(84,84,88,0.65)',
                      margin: '0 16px',
                    }}
                  />
                )}
                <div
                  style={{
                    padding: '14px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                  }}
                >
                  <span
                    style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: meta.color,
                      flexShrink: 0,
                    }}
                  />
                  <span style={{ fontSize: '15px', color: '#FFF', flex: 1 }}>{meta.label}</span>
                  <div
                    style={{
                      flex: 2,
                      height: '4px',
                      background: 'rgba(118,118,128,0.15)',
                      borderRadius: '2px',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        borderRadius: '2px',
                        background: meta.color,
                        width: loading ? '0%' : `${pct}%`,
                        transition: 'width 0.4s ease',
                      }}
                    />
                  </div>
                  <span
                    style={{
                      fontSize: '15px',
                      fontWeight: 600,
                      color: '#FFF',
                      minWidth: '28px',
                      textAlign: 'right',
                    }}
                  >
                    {loading ? '—' : count}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Rep Leaderboard */}
      {!loading && summary && summary.repStats.length > 0 && (
        <div style={{ padding: '0 16px 16px' }}>
          <p style={sectionLabel}>Rep Activity</p>
          <div style={{ background: '#1C1C1E', borderRadius: '16px', overflow: 'hidden' }}>
            {summary.repStats.map((rep, index) => {
              const color = AVATAR_COLORS[index % AVATAR_COLORS.length] ?? '#D97706'
              return (
                <div key={rep.user_id}>
                  {index > 0 && (
                    <div
                      style={{
                        height: '0.5px',
                        background: 'rgba(84,84,88,0.65)',
                        margin: '0 16px',
                      }}
                    />
                  )}
                  <div
                    style={{
                      padding: '14px 16px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                    }}
                  >
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        background: `${color}20`,
                        border: `0.5px solid ${color}40`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <span style={{ fontSize: '13px', fontWeight: 600, color }}>
                        {getInitials(rep.user_name || '?')}
                      </span>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p
                        style={{
                          fontSize: '15px',
                          fontWeight: 500,
                          color: '#FFF',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {rep.user_name || 'Unknown'}
                      </p>
                      <p
                        style={{
                          fontSize: '12px',
                          color: 'rgba(235,235,245,0.45)',
                          marginTop: '2px',
                        }}
                      >
                        {rep.newLeads} new lead{rep.newLeads !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <p style={{ fontSize: '15px', fontWeight: 600, color: '#FFF' }}>
                        {rep.checkIns}
                      </p>
                      <p
                        style={{
                          fontSize: '12px',
                          color: 'rgba(235,235,245,0.45)',
                          marginTop: '2px',
                        }}
                      >
                        check-ins
                      </p>
                    </div>
                    <div
                      style={{ textAlign: 'right', flexShrink: 0, minWidth: '52px' }}
                    >
                      <p style={{ fontSize: '15px', fontWeight: 600, color: '#FFF' }}>
                        {rep.distanceKm.toFixed(1)}
                      </p>
                      <p
                        style={{
                          fontSize: '12px',
                          color: 'rgba(235,235,245,0.45)',
                          marginTop: '2px',
                        }}
                      >
                        km
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Flagged Check-ins */}
      {!flaggedLoading && flagged.length > 0 && (
        <div style={{ padding: '0 16px 16px' }}>
          <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <AlertTriangle size={14} style={{ color: '#FF9F0A' }} />
            <p style={sectionLabel}>Flagged Check-ins</p>
          </div>
          <div
            style={{
              background: '#1C1C1E',
              borderRadius: '16px',
              overflow: 'hidden',
              border: '0.5px solid rgba(255,159,10,0.2)',
            }}
          >
            {flagged.map((item, index) => (
              <div key={item.id}>
                {index > 0 && (
                  <div
                    style={{
                      height: '0.5px',
                      background: 'rgba(84,84,88,0.65)',
                      margin: '0 16px',
                    }}
                  />
                )}
                <div style={{ padding: '14px 16px' }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      justifyContent: 'space-between',
                      gap: '8px',
                    }}
                  >
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <p
                        style={{
                          fontSize: '15px',
                          fontWeight: 500,
                          color: '#FFF',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {item.leads?.cafe_name ?? 'Unknown café'}
                      </p>
                      <p
                        style={{
                          fontSize: '13px',
                          color: 'rgba(235,235,245,0.45)',
                          marginTop: '2px',
                        }}
                      >
                        {item.user_name}
                      </p>
                    </div>
                    <div style={{ flexShrink: 0, textAlign: 'right' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          borderRadius: '6px',
                          padding: '2px 8px',
                          fontSize: '11px',
                          fontWeight: 600,
                          background: 'rgba(255,159,10,0.15)',
                          color: '#FF9F0A',
                        }}
                      >
                        {parseFlagDistance(item.remarks)}
                      </span>
                      <p
                        style={{
                          fontSize: '11px',
                          color: 'rgba(235,235,245,0.3)',
                          marginTop: '4px',
                        }}
                      >
                        {new Date(item.created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loading && summary && summary.checkIns === 0 && summary.repStats.length === 0 && (
        <div style={{ padding: '48px 24px', textAlign: 'center' }}>
          <p style={{ fontSize: '15px', color: 'rgba(235,235,245,0.3)' }}>
            No activity in this period
          </p>
        </div>
      )}
    </div>
  )
}

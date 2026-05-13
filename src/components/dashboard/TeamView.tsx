'use client'

import { useCallback, useEffect, useState } from 'react'
import type { Profile } from '@/types'

interface Member {
  id: string
  full_name: string
  email: string
  role: 'rep' | 'manager'
  created_at: string
}

interface Props {
  profile: Profile
}

function getInitials(name: string): string {
  return name.split(' ').slice(0, 2).map(n => n[0] ?? '').join('').toUpperCase()
}

export default function TeamView({ profile }: Props) {
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)

  const fetchMembers = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/team/members')
      if (!res.ok) return
      const data = await res.json() as { members: Member[] }
      setMembers(data.members ?? [])
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void fetchMembers() }, [fetchMembers])

  async function changeRole(member: Member, newRole: 'rep' | 'manager') {
    const confirmed = window.confirm(
      `Make ${member.full_name} a ${newRole === 'manager' ? 'Manager' : 'Rep'}? This changes their access.`
    )
    if (!confirmed) return

    setUpdating(member.id)
    try {
      const res = await fetch(`/api/team/members/${member.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      })
      if (!res.ok) return
      setMembers(prev =>
        prev.map(m => m.id === member.id ? { ...m, role: newRole } : m)
      )
    } catch {
      // ignore
    } finally {
      setUpdating(null)
    }
  }

  if (loading) {
    return (
      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {[1, 2, 3].map(i => (
          <div
            key={i}
            className="animate-pulse"
            style={{ height: '72px', borderRadius: '12px', background: 'var(--bg-card)' }}
          />
        ))}
      </div>
    )
  }

  return (
    <div style={{ padding: '0 16px 16px' }}>
      <p
        style={{
          marginBottom: '12px',
          fontSize: '13px',
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          color: 'var(--label-tertiary)',
        }}
      >
        Team Members
      </p>

      <div style={{ background: 'var(--bg-card)', borderRadius: '16px', overflow: 'hidden' }}>
        {members.map((member, index) => {
          const isSelf = member.id === profile.id
          const isManager = member.role === 'manager'
          const busy = updating === member.id

          return (
            <div key={member.id}>
              {index > 0 && (
                <div style={{ height: '0.5px', background: 'var(--separator)', margin: '0 16px' }} />
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
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    flexShrink: 0,
                    background: isManager ? 'rgba(217,119,6,0.15)' : 'rgba(10,132,255,0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <span
                    style={{
                      fontSize: '14px',
                      fontWeight: 600,
                      color: isManager ? '#D97706' : '#0A84FF',
                    }}
                  >
                    {getInitials(member.full_name)}
                  </span>
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <p
                    style={{
                      fontSize: '17px',
                      fontWeight: 500,
                      color: 'var(--label-primary)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {member.full_name}
                    {isSelf && (
                      <span style={{ marginLeft: '6px', fontSize: '13px', color: 'var(--label-tertiary)' }}>
                        (You)
                      </span>
                    )}
                  </p>
                  <p
                    style={{
                      fontSize: '13px',
                      color: 'var(--label-secondary)',
                      marginTop: '2px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {member.email}
                  </p>
                </div>

                <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                  <span
                    style={{
                      borderRadius: '20px',
                      padding: '4px 12px',
                      fontSize: '13px',
                      fontWeight: 600,
                      background: isManager ? 'rgba(217,119,6,0.15)' : 'rgba(10,132,255,0.15)',
                      color: isManager ? '#D97706' : '#0A84FF',
                    }}
                  >
                    {isManager ? 'Manager' : 'Rep'}
                  </span>

                  {!isSelf && (
                    <button
                      type="button"
                      onClick={() => void changeRole(member, isManager ? 'rep' : 'manager')}
                      disabled={busy}
                      style={{
                        fontSize: '12px',
                        fontWeight: 500,
                        color: isManager ? 'var(--label-tertiary)' : '#D97706',
                        background: 'none',
                        border: 'none',
                        cursor: busy ? 'not-allowed' : 'pointer',
                        padding: '2px 0',
                        opacity: busy ? 0.5 : 1,
                        fontFamily: 'inherit',
                      }}
                    >
                      {busy ? 'Saving…' : isManager ? 'Make Rep' : 'Make Manager'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

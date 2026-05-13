import { Lock } from 'lucide-react'

export default function AccessRestricted() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: 'calc(100dvh - 200px)',
        gap: '16px',
        padding: '24px',
      }}
    >
      <div
        style={{
          width: '64px',
          height: '64px',
          borderRadius: '20px',
          background: 'rgba(255,69,58,0.12)',
          border: '0.5px solid rgba(255,69,58,0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Lock size={28} style={{ color: '#FF453A' }} />
      </div>
      <div style={{ textAlign: 'center' }}>
        <p style={{ fontSize: '17px', fontWeight: 600, color: 'var(--label-primary)' }}>Manager Access Only</p>
        <p style={{ marginTop: '6px', fontSize: '15px', color: 'var(--label-tertiary)' }}>
          Reports are only available to managers.
        </p>
      </div>
    </div>
  )
}

export default function ReportsLoading() {
  return (
    <div style={{ background: 'var(--bg-page)', padding: 16, paddingBottom: 100, display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header skeleton */}
      <div className="animate-pulse" style={{ height: 28, width: 140, borderRadius: 8, background: 'var(--bg-card)' }} />

      {/* Stat cards skeleton */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {[1, 2, 3, 4].map(i => (
          <div
            key={i}
            className="animate-pulse"
            style={{ height: 90, borderRadius: 16, background: 'var(--bg-card)' }}
          />
        ))}
      </div>

      {/* Chart skeleton */}
      <div className="animate-pulse" style={{ height: 200, borderRadius: 16, background: 'var(--bg-card)' }} />

      {/* List skeleton */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {[1, 2, 3, 4].map(i => (
          <div
            key={i}
            className="animate-pulse"
            style={{ height: 56, borderRadius: 12, background: 'var(--bg-card)' }}
          />
        ))}
      </div>
    </div>
  )
}

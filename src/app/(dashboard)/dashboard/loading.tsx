export default function DashboardLoading() {
  return (
    <div style={{ background: 'var(--bg-page)', paddingBottom: 100 }}>
      {/* Stats row skeleton */}
      <div style={{ display: 'flex', gap: 10, padding: 16, overflowX: 'hidden' }}>
        {[1, 2, 3].map(i => (
          <div
            key={i}
            className="animate-pulse"
            style={{ minWidth: 110, height: 80, borderRadius: 16, background: 'var(--bg-card)', flexShrink: 0 }}
          />
        ))}
      </div>

      {/* Search skeleton */}
      <div style={{ padding: '0 16px 10px' }}>
        <div className="animate-pulse" style={{ height: 36, borderRadius: 10, background: 'var(--bg-card)' }} />
      </div>

      {/* Filter pills skeleton */}
      <div style={{ display: 'flex', gap: 8, padding: '0 16px 12px', overflow: 'hidden' }}>
        {[80, 96, 72, 68, 100, 110].map((w, i) => (
          <div
            key={i}
            className="animate-pulse"
            style={{ width: w, height: 32, borderRadius: 8, background: 'var(--bg-card)', flexShrink: 0 }}
          />
        ))}
      </div>

      {/* Lead list skeleton */}
      <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {[1, 2, 3, 4].map(i => (
          <div
            key={i}
            className="animate-pulse"
            style={{ height: 110, borderRadius: 16, background: 'var(--bg-card)' }}
          />
        ))}
      </div>
    </div>
  )
}

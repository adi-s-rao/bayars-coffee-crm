export default function MapLoading() {
  return (
    <div style={{ height: 'calc(100vh - 44px)', background: 'var(--bg-page)', display: 'flex', flexDirection: 'column' }}>
      {/* Filter bar skeleton */}
      <div style={{ padding: '12px 16px', borderBottom: '0.5px solid var(--separator)', display: 'flex', gap: 8 }}>
        {[80, 72, 90, 80].map((w, i) => (
          <div
            key={i}
            className="animate-pulse"
            style={{ width: w, height: 32, borderRadius: 8, background: 'var(--bg-card)', flexShrink: 0 }}
          />
        ))}
      </div>
      {/* Map skeleton */}
      <div className="animate-pulse" style={{ flex: 1, background: 'var(--bg-card)' }} />
    </div>
  )
}

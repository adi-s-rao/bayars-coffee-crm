export default function CalendarLoading() {
  return (
    <div style={{ background: 'var(--bg-page)', padding: 16, paddingBottom: 100 }}>
      {/* Month header skeleton */}
      <div className="animate-pulse" style={{ height: 44, borderRadius: 12, background: 'var(--bg-card)', marginBottom: 16 }} />

      {/* Calendar grid skeleton */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 16 }}>
        {Array.from({ length: 35 }).map((_, i) => (
          <div
            key={i}
            className="animate-pulse"
            style={{ height: 40, borderRadius: 8, background: 'var(--bg-card)' }}
          />
        ))}
      </div>

      {/* Schedule list skeleton */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {[1, 2, 3].map(i => (
          <div
            key={i}
            className="animate-pulse"
            style={{ height: 72, borderRadius: 16, background: 'var(--bg-card)' }}
          />
        ))}
      </div>
    </div>
  )
}

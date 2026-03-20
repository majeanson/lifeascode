export function FeatureCardSkeleton() {
  return (
    <div className="rounded-lg border border-border bg-card p-4 animate-pulse">
      {/* Header row: key bar */}
      <div className="h-3 w-24 bg-muted rounded" />

      {/* Title bars */}
      <div className="mt-2 h-4 w-3/4 bg-muted rounded" />
      <div className="mt-1 h-4 w-1/2 bg-muted rounded" />

      {/* Pip row */}
      <div className="mt-2 flex gap-1">
        {Array.from({ length: 5 }, (_, i) => (
          <span key={i} className="h-2 w-2 rounded-full bg-muted" />
        ))}
      </div>

      {/* Metadata bar */}
      <div className="mt-2 h-3 w-32 bg-muted rounded" />
    </div>
  )
}

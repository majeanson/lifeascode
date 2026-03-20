export default function FeatureDetailLoading() {
  return (
    <div className="animate-pulse flex flex-col gap-6 p-6">
      {/* Breadcrumb */}
      <div className="h-3 w-40 rounded bg-muted" />

      {/* Header */}
      <div className="flex flex-col gap-3">
        <div className="h-4 w-24 rounded bg-muted" />
        <div className="h-8 w-80 rounded bg-muted" />
        <div className="flex gap-2">
          <div className="h-5 w-20 rounded bg-muted" />
          <div className="h-5 w-16 rounded bg-muted" />
        </div>
      </div>

      {/* Tab strip */}
      <div className="flex gap-4 border-b border-border pb-0">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="h-8 w-20 rounded-t bg-muted" />
        ))}
      </div>

      {/* Tab content */}
      <div className="flex flex-col gap-4">
        <div className="h-4 w-full rounded bg-muted" />
        <div className="h-4 w-5/6 rounded bg-muted" />
        <div className="h-4 w-4/6 rounded bg-muted" />
        <div className="mt-4 h-32 w-full rounded bg-muted" />
      </div>
    </div>
  )
}

export default function AdminLoading() {
  return (
    <div className="animate-pulse flex flex-col gap-6 p-6">
      {/* Tab strip */}
      <div className="flex gap-4 border-b border-border pb-0">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-8 w-24 rounded-t bg-muted" />
        ))}
      </div>

      {/* Content area */}
      <div className="flex flex-col gap-4">
        <div className="h-6 w-40 rounded bg-muted" />
        <div className="h-64 w-full rounded bg-muted" />
      </div>
    </div>
  )
}

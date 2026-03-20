export default function DocsLoading() {
  return (
    <div className="animate-pulse p-6 flex gap-6">
      {/* Sidebar */}
      <div className="flex w-48 shrink-0 flex-col gap-3">
        <div className="h-4 w-32 rounded bg-muted" />
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="h-3 w-full rounded bg-muted" />
        ))}
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col gap-4">
        <div className="h-8 w-64 rounded bg-muted" />
        <div className="h-4 w-full rounded bg-muted" />
        <div className="h-4 w-5/6 rounded bg-muted" />
        <div className="h-4 w-4/6 rounded bg-muted" />
        <div className="mt-4 h-48 w-full rounded bg-muted" />
      </div>
    </div>
  )
}

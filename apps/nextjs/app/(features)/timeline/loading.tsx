export default function TimelineLoading() {
  return (
    <div className="animate-pulse flex flex-col gap-6 p-6">
      <div className="h-6 w-32 rounded bg-muted" />
      <div className="flex flex-col gap-3">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center gap-4">
            <div className="h-3 w-20 shrink-0 rounded bg-muted" />
            <div className="h-px flex-1 bg-muted" />
            <div className="h-10 w-48 rounded bg-muted" />
          </div>
        ))}
      </div>
    </div>
  )
}

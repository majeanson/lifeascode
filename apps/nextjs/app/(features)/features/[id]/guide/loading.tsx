export default function GuideLoading() {
  return (
    <div className="animate-pulse flex flex-col gap-6 p-6">
      <div className="h-4 w-40 rounded bg-muted" />
      <div className="h-7 w-72 rounded bg-muted" />
      <div className="flex flex-col gap-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex flex-col gap-2 rounded-lg border border-border p-4">
            <div className="h-4 w-32 rounded bg-muted" />
            <div className="h-3 w-full rounded bg-muted" />
            <div className="h-3 w-5/6 rounded bg-muted" />
          </div>
        ))}
      </div>
    </div>
  )
}

export default function TreeLoading() {
  return (
    <div className="flex h-[calc(100dvh-3rem)] flex-col px-4 pt-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex flex-col gap-2">
          <div className="h-6 w-36 animate-pulse rounded bg-muted" />
          <div className="h-3 w-64 animate-pulse rounded bg-muted" />
        </div>
      </div>
      <div className="flex-1 animate-pulse rounded-lg border border-border bg-muted" />
    </div>
  )
}

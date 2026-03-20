export default function FeatureJsonLoading() {
  return (
    <div className="animate-pulse flex flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <div className="h-5 w-40 rounded bg-muted" />
        <div className="h-8 w-20 rounded bg-muted" />
      </div>
      <div className="h-[calc(100dvh-12rem)] w-full rounded-lg border border-border bg-muted" />
    </div>
  )
}

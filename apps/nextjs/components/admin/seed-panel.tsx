"use client"

import { useState } from 'react'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { useTRPC } from '@/trpc/react'

export function SeedPanel() {
  const trpc = useTRPC()
  const queryClient = useQueryClient()

  const [count, setCount] = useState(10000)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [lastResult, setLastResult] = useState<string | null>(null)

  const { data: stats } = useQuery(trpc.features.getStats.queryOptions())

  const seedMutation = useMutation(
    trpc.features.admin.seedTestData.mutationOptions({
      onSuccess(data) {
        setLastResult(`Inserted ${data.inserted} features (${data.startKey} → ${data.endKey})`)
        void queryClient.invalidateQueries({ queryKey: [['features']] }) // invalidates all feature queries
      },
      onError(err) {
        setLastResult(`Error: ${err.message}`)
      },
    }),
  )

  const deleteMutation = useMutation(
    trpc.features.admin.deleteAllData.mutationOptions({
      onSuccess(data) {
        setLastResult(`Deleted ${data.deleted} features and all their events.`)
        setDeleteConfirm(false)
        void queryClient.invalidateQueries({ queryKey: [['features']] }) // invalidates all feature queries
      },
      onError(err) {
        setLastResult(`Error: ${err.message}`)
        setDeleteConfirm(false)
      },
    }),
  )

  const isLoading = seedMutation.isPending || deleteMutation.isPending

  return (
    <section className="flex flex-col gap-6">
      <div>
        <h2 className="text-sm font-semibold text-foreground">Dev / Seed Data</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Insert bulk test data or wipe all features. Currently{' '}
          <span className="font-mono font-medium text-foreground">{(stats?.total ?? 0).toLocaleString()}</span>{' '}
          features in the database.
        </p>
      </div>

      {/* Insert section */}
      <div className="rounded-lg border border-border bg-card p-4 flex flex-col gap-3">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Insert test features</h3>
        <p className="text-xs text-muted-foreground">
          Each batch inserts features covering all 9 lifecycle stages, all field keys, parent-child
          linkages, inline decisions, tags, and all status values (active, draft, flagged, frozen).
          You can press the button multiple times to accumulate more data.
        </p>

        <div className="flex items-center gap-3">
          <label className="text-xs text-muted-foreground shrink-0">Count</label>
          <input
            type="number"
            min={1}
            max={10000}
            value={count}
            onChange={(e) => { setCount(Math.max(1, Math.min(10000, Number(e.target.value)))) }}
            className="w-28 rounded border border-border bg-background px-2 py-1 text-sm font-mono outline-none focus:ring-2 focus:ring-ring"
            disabled={isLoading}
          />
        </div>

        <button
          type="button"
          disabled={isLoading}
          onClick={() => { seedMutation.mutate({ count }) }}
          className="self-start rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          {seedMutation.isPending ? 'Inserting…' : `Add ${count.toLocaleString()} features`}
        </button>
      </div>

      {/* Delete section */}
      <div className="rounded-lg border border-destructive/30 bg-card p-4 flex flex-col gap-3">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-destructive">Danger zone — delete all data</h3>
        <p className="text-xs text-muted-foreground">
          Permanently deletes <strong>all</strong> features and events for the default org, including frozen ones.
          This cannot be undone.
        </p>

        {!deleteConfirm ? (
          <button
            type="button"
            disabled={isLoading || (stats?.total ?? 0) === 0}
            onClick={() => { setDeleteConfirm(true) }}
            className="self-start rounded-md border border-destructive/50 px-4 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-40"
          >
            Delete all {(stats?.total ?? 0) > 0 ? `(${stats!.total.toLocaleString()})` : ''} features
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-xs text-destructive font-medium">Are you sure? This is irreversible.</span>
            <button
              type="button"
              disabled={deleteMutation.isPending}
              onClick={() => { deleteMutation.mutate() }}
              className="rounded-md bg-destructive px-3 py-1.5 text-xs font-medium text-destructive-foreground transition-colors hover:bg-destructive/90 disabled:opacity-50"
            >
              {deleteMutation.isPending ? 'Deleting…' : 'Yes, delete everything'}
            </button>
            <button
              type="button"
              disabled={deleteMutation.isPending}
              onClick={() => { setDeleteConfirm(false) }}
              className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted"
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      {/* Result log */}
      {lastResult && (
        <div className="rounded-md border border-border bg-muted/40 px-3 py-2 font-mono text-xs text-foreground/80">
          {lastResult}
        </div>
      )}
    </section>
  )
}

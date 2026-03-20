"use client"

import { useMemo, useState } from 'react'

import { useMutation, useQuery } from '@tanstack/react-query'

import { Button } from '@life-as-code/ui'

import { useToastStore } from '@/stores/toast-store'
import { useTRPC } from '@/trpc/react'

export function ExportPanel() {
  const [statusFilter, setStatusFilter] = useState<'active' | 'draft' | 'frozen' | 'flagged' | ''>('')
  const [tagsInput, setTagsInput] = useState('')

  const trpc = useTRPC()
  const showToast = useToastStore((s) => s.showToast)
  const { data: stats } = useQuery(trpc.features.getStats.queryOptions())

  const estimatedCount = useMemo(() => {
    if (!stats) return null
    if (!statusFilter) return stats.total
    return stats[statusFilter]
  }, [stats, statusFilter])

  const exportMutation = useMutation(
    trpc.features.admin.exportAll.mutationOptions({
      onSuccess: (data) => {
        const dateStr = new Date().toISOString().slice(0, 10)
        const suffix = statusFilter ? `-${statusFilter}` : ''
        const filename = `life-as-code-export${suffix}-${dateStr}.json`
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = filename
        document.body.append(a)
        a.click()
        a.remove()
        URL.revokeObjectURL(url)
      },
      onError: () => {
        showToast({ type: 'error', message: 'Export failed' })
      },
    }),
  )

  function handleExport() {
    const tags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)
    exportMutation.mutate({
      status: statusFilter || undefined,
      tags: tags.length > 0 ? tags : undefined,
    })
  }

  const inputClass = 'w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary'
  const selectClass = 'w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary'

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-base font-semibold text-foreground">Export Project Data</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Download a complete JSON backup of all feature artifacts, including full event history.
        </p>
      </div>

      <div className="flex flex-col gap-4 rounded-lg border border-border p-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="export-status-filter" className="text-sm font-medium text-foreground">
            Status filter
          </label>
          <select
            id="export-status-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
            className={selectClass}
          >
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="draft">Draft</option>
            <option value="frozen">Frozen</option>
            <option value="flagged">Flagged</option>
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="export-tags-filter" className="text-sm font-medium text-foreground">
            Tag filter <span className="text-muted-foreground font-normal">(comma-separated)</span>
          </label>
          <input
            id="export-tags-filter"
            type="text"
            placeholder="e.g. backend, billing"
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            className={inputClass}
          />
        </div>

        <div className="flex items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            {estimatedCount === null
              ? 'Loading feature count…'
              : `~${estimatedCount} feature${estimatedCount === 1 ? '' : 's'} will be exported`}
          </p>
          <Button type="button" disabled={exportMutation.isPending} onClick={handleExport}>
            {exportMutation.isPending ? (
              <>
                <span aria-hidden="true">⏳</span> Exporting…
              </>
            ) : (
              'Export all features'
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}

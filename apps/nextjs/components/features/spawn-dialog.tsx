"use client"

import { useEffect, useRef, useState } from 'react'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'

import { Button } from '@life-as-code/ui'

import { useToastStore } from '@/stores/toast-store'
import { useTRPC } from '@/trpc/react'

interface SpawnDialogProps {
  parentId: string
  parentFeatureKey: string
  parentTitle: string
  onClose: () => void
}

export function SpawnDialog({ parentId, parentFeatureKey, parentTitle, onClose }: SpawnDialogProps) {
  const [spawnReason, setSpawnReason] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const router = useRouter()
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const showToast = useToastStore((s) => s.showToast)
  const currentYear = new Date().getFullYear()

  const spawnMutation = useMutation(trpc.features.spawn.mutationOptions())

  // Focus spawn reason textarea on open
  useEffect(() => {
    textareaRef.current?.focus()
  }, [])

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => { document.removeEventListener('keydown', handleKeyDown) }
  }, [onClose])

  function handleSpawn() {
    if (!spawnReason.trim()) return
    spawnMutation.mutate(
      { parentId, spawnReason: spawnReason.trim() },
      {
        onSuccess: (child) => {
          void queryClient.invalidateQueries({ queryKey: [['features', 'listFeaturesPaginated']] })
          void queryClient.invalidateQueries({ queryKey: [['features', 'getStats']] })
          void queryClient.invalidateQueries({ queryKey: [['features', 'listRecent']] })
          void queryClient.invalidateQueries({ queryKey: [['features', 'listRootFeatures']] })
          showToast({ type: 'success', message: `Spawned ${child.featureKey}` })
          router.push(`/features/${child.id}/wizard`)
        },
      },
    )
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      onKeyDown={(e) => { if (e.key === 'Escape') onClose() }}
      role="dialog"
      aria-modal="true"
      aria-label="Spawn child feature"
    >
      {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions */}
      <div className="w-full max-w-lg overflow-hidden rounded-xl border border-border bg-background shadow-2xl">
        {/* Header */}
        <div className="border-b border-border px-6 py-4">
          <h2 className="text-base font-semibold text-foreground">Spawn Child Feature</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            This feature is frozen — its record is permanent. Want to evolve it? Spawn a child feature that links back to this one.
          </p>
        </div>

        {/* Parent context (read-only) */}
        <div className="border-b border-border bg-muted/40 px-6 py-3">
          <p className="text-xs font-medium text-muted-foreground">Parent feature (frozen)</p>
          <div className="mt-1 flex items-center gap-2">
            <span className="font-mono text-xs text-muted-foreground">{parentFeatureKey}</span>
            <span className="truncate text-xs text-foreground">{parentTitle}</span>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Proposed child key: <span className="font-mono font-medium text-foreground">feat-{currentYear}-???</span>
          </p>
        </div>

        {/* Spawn reason field */}
        <div className="px-6 py-4">
          <label htmlFor="spawn-reason" className="mb-2 block text-sm font-medium text-foreground">
            Spawn reason <span className="text-destructive">*</span>
          </label>
          <textarea
            id="spawn-reason"
            ref={textareaRef}
            value={spawnReason}
            onChange={(e) => { setSpawnReason(e.target.value) }}
            placeholder="Why is this feature being evolved? What is changing?"
            rows={4}
            className="w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            aria-required="true"
          />
          {spawnMutation.isError && (
            <p className="mt-1 text-xs text-destructive">{spawnMutation.error.message}</p>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex justify-end gap-2 border-t border-border px-6 py-4">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="default"
            onClick={handleSpawn}
            disabled={!spawnReason.trim() || spawnMutation.isPending}
          >
            {spawnMutation.isPending ? 'Spawning…' : 'Spawn Child Feature'}
          </Button>
        </div>
      </div>
    </div>
  )
}

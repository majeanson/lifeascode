"use client"

import { useState } from 'react'

import { useMutation, useQueryClient } from '@tanstack/react-query'

import { Button } from '@life-as-code/ui'

import { useToastStore } from '@/stores/toast-store'
import { useTRPC } from '@/trpc/react'

interface FreezeConfirmPopoverProps {
  featureId: string
}

export function FreezeConfirmPopover({ featureId }: FreezeConfirmPopoverProps) {
  const [showConfirm, setShowConfirm] = useState(false)
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const showToast = useToastStore((s) => s.showToast)

  const freezeMutation = useMutation(trpc.features.freeze.mutationOptions())

  function handleFreeze() {
    freezeMutation.mutate(
      { id: featureId },
      {
        onSuccess: () => {
          void queryClient.invalidateQueries({ queryKey: trpc.features.getFeature.queryOptions({ id: featureId }).queryKey })
          void queryClient.invalidateQueries({ queryKey: [['features', 'listFeaturesPaginated']] })
          void queryClient.invalidateQueries({ queryKey: [['features', 'getStats']] })
          void queryClient.invalidateQueries({ queryKey: [['features', 'listRecent']] })
          void queryClient.invalidateQueries({ queryKey: [['features', 'listRootFeatures']] })
          setShowConfirm(false)
          showToast({ type: 'success', message: 'Feature frozen. It is now a permanent, read-only record.' })
        },
      },
    )
  }

  return (
    <div className="relative">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => { setShowConfirm((v) => !v) }}
      >
        Freeze this feature
      </Button>

      {showConfirm && (
        <div className="absolute right-0 top-full z-10 mt-2 w-72 rounded-lg border border-border bg-background p-4 shadow-lg">
          <p className="mb-3 text-sm text-foreground">
            This feature will become a permanent, read-only record. You can always evolve it by spawning a child.
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={handleFreeze}
              disabled={freezeMutation.isPending}
            >
              {freezeMutation.isPending ? 'Freezing…' : 'Yes, freeze it'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => { setShowConfirm(false) }}
            >
              Cancel
            </Button>
          </div>
          {freezeMutation.isError && (
            <p className="mt-2 text-xs text-destructive">
              {freezeMutation.error.message}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

"use client"

import { useState } from 'react'

import { useMutation, useQueryClient } from '@tanstack/react-query'

import { Button } from '@life-as-code/ui'
import type { DecisionEntry, LifecycleStage } from '@life-as-code/validators'

import { useTRPC } from '@/trpc/react'

import { DecisionLogEntry } from './decision-log-entry'

interface DecisionLogPanelProps {
  featureId: string
  stage: LifecycleStage
  decisions: DecisionEntry[]
}

export function DecisionLogPanel({ featureId, stage, decisions }: DecisionLogPanelProps) {
  const trpc = useTRPC()
  const queryClient = useQueryClient()

  const [isFormOpen, setIsFormOpen] = useState(false)
  const [what, setWhat] = useState('')
  const [why, setWhy] = useState('')
  const [alternatives, setAlternatives] = useState('')

  const addDecisionMutation = useMutation({
    ...trpc.features.addDecision.mutationOptions(),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: trpc.features.getFeature.queryKey({ id: featureId }),
      })
      setIsFormOpen(false)
      setWhat('')
      setWhy('')
      setAlternatives('')
    },
  })

  const handleSubmit = () => {
    if (!what.trim() || !why.trim()) return
    addDecisionMutation.mutate({
      featureId,
      stage,
      entry: { what: what.trim(), why: why.trim(), alternatives: alternatives.trim() || undefined },
    })
  }

  const handleCancel = () => {
    setIsFormOpen(false)
    setWhat('')
    setWhy('')
    setAlternatives('')
  }

  return (
    <div className="flex flex-col gap-2">
      <Button type="button" variant="ghost" size="sm" onClick={() => setIsFormOpen(!isFormOpen)}>
        + Add Decision
      </Button>

      {isFormOpen ? (
        <div className="flex flex-col gap-2">
          <textarea
            aria-label="What was decided"
            placeholder="What was decided…"
            value={what}
            onChange={(e) => setWhat(e.target.value)}
            className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            style={{ fieldSizing: 'content' } as React.CSSProperties}
            rows={2}
          />
          <textarea
            aria-label="Why this decision was made"
            placeholder="Why…"
            value={why}
            onChange={(e) => setWhy(e.target.value)}
            className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            style={{ fieldSizing: 'content' } as React.CSSProperties}
            rows={2}
          />
          <textarea
            aria-label="Alternatives considered (optional)"
            placeholder="Alternatives considered (optional)…"
            value={alternatives}
            onChange={(e) => setAlternatives(e.target.value)}
            className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            style={{ fieldSizing: 'content' } as React.CSSProperties}
            rows={2}
          />
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              onClick={handleSubmit}
              disabled={addDecisionMutation.isPending || !what.trim() || !why.trim()}
            >
              Submit
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={handleCancel}>
              Cancel
            </Button>
          </div>
        </div>
      ) : null}

      {decisions.map((entry) => (
        <DecisionLogEntry key={entry.id} entry={entry} />
      ))}
    </div>
  )
}

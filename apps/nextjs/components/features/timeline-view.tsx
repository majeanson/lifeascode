"use client"

import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'

import { useTRPC } from '@/trpc/react'
import type { RouterOutputs } from '@life-as-code/api'
import { TimelineCard } from './timeline-card'

type TimelineFeature = RouterOutputs['features']['getTimeline'][number]

function deriveTitle(feature: TimelineFeature): string {
  // title is pre-extracted from JSONB; fall back to problem excerpt or featureKey
  if (feature.title) return feature.title
  if (feature.problem) {
    const words = feature.problem.split(' ')
    return words.length > 6 ? words.slice(0, 6).join(' ') + '…' : feature.problem
  }
  return feature.featureKey
}

function groupByPeriod(featureList: TimelineFeature[]) {
  const periodMap = new Map<string, TimelineFeature[]>()
  for (const f of featureList) {
    const col = periodMap.get(f.targetPeriod!)
    if (col) { col.push(f) } else { periodMap.set(f.targetPeriod!, [f]) }
  }
  return [...periodMap.entries()].toSorted(([a], [b]) => a.localeCompare(b))
}

export function TimelineView() {
  const trpc = useTRPC()
  const { data: features } = useQuery(trpc.features.getTimeline.queryOptions({ limit: 500 }))

  if (!features) {
    return (
      <div className="flex gap-4 overflow-x-auto p-6 min-h-screen">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex-shrink-0 w-64 animate-pulse">
            <div className="h-5 w-32 bg-muted rounded mb-3" />
            <div className="flex flex-col gap-2">
              {[0, 1, 2].map((j) => (
                <div key={j} className="h-20 bg-muted rounded border border-border" />
              ))}
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (features.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="text-center">
          <p className="text-muted-foreground mb-3">No scheduled features — set a target period on a feature to add it here</p>
          <Link href="/features" className="text-primary underline underline-offset-4 text-sm">
            Browse features
          </Link>
        </div>
      </div>
    )
  }

  const parentIds = new Set<string>()
  for (const f of features) {
    if (f.parentId !== null) parentIds.add(f.parentId)
  }

  const sortedPeriods = groupByPeriod(features)

  return (
    <div className="flex gap-4 overflow-x-auto p-6 min-h-screen">
      {sortedPeriods.map(([period, periodFeatures]) => (
        <div key={period} className="flex-shrink-0 w-64">
          <h2 className="text-sm font-semibold text-foreground mb-3">
            {period} · {periodFeatures.length}
          </h2>
          <div className="flex flex-col gap-2">
            {periodFeatures.map((f) => (
              <TimelineCard
                key={f.id}
                id={f.id}
                title={deriveTitle(f)}
                status={f.status}
                frozen={f.frozen}
                score={f.score}
                hasParent={f.parentId !== null}
                hasChildren={parentIds.has(f.id)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

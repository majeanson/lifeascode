"use client"

import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'

import type { Feature } from '@life-as-code/db'

import { useTRPC } from '@/trpc/react'

import { FeatureStateBadge } from './feature-state-badge'

interface LineageSectionProps {
  featureId: string
}

function getTitle(feature: Feature): string {
  const contentMap = feature.content as Record<string, Record<string, unknown>> | undefined
  return (contentMap?.problem?.problemStatement as string | undefined) ?? 'Untitled'
}

function getSpawnReason(feature: Feature): string | undefined {
  const contentMap = feature.content as Record<string, Record<string, unknown>> | undefined
  return contentMap?.spawn?.spawnReason as string | undefined
}

function LineageCard({ feature, spawnReason }: { feature: Feature; spawnReason?: string }) {
  const title = getTitle(feature)
  return (
    <div className="flex flex-col gap-1">
      <Link
        href={`/features/${feature.id}`}
        className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm transition-colors hover:border-primary"
      >
        <span className="shrink-0 font-mono text-xs text-muted-foreground">{feature.featureKey}</span>
        <span className="flex-1 truncate text-foreground">{title}</span>
        <FeatureStateBadge status={feature.status} frozen={feature.frozen} variant="compact" />
      </Link>
      {spawnReason && (
        <p className="px-3 text-xs text-muted-foreground">
          <span className="font-medium">Spawn reason:</span> {spawnReason}
        </p>
      )}
    </div>
  )
}

export function LineageSection({ featureId }: LineageSectionProps) {
  const trpc = useTRPC()
  const { data } = useQuery(trpc.features.getLineage.queryOptions({ id: featureId }))

  if (!data) return null

  const { parent, siblings, children } = data
  const hasLineage = parent !== null || siblings.length > 0 || children.length > 0

  if (!hasLineage) return null

  return (
    <section aria-label="Feature lineage" className="mb-6 flex flex-col gap-4">
      <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Lineage</h3>

      {parent && (
        <div className="flex flex-col gap-2">
          <p className="text-xs text-muted-foreground">Parent</p>
          <LineageCard feature={parent} />
        </div>
      )}

      {siblings.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-xs text-muted-foreground">Siblings ({siblings.length})</p>
          <div className="flex flex-col gap-1.5">
            {siblings.map((sibling) => (
              <LineageCard key={sibling.id} feature={sibling} />
            ))}
          </div>
        </div>
      )}

      {children.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-xs text-muted-foreground">Children ({children.length})</p>
          <div className="flex flex-col gap-3">
            {children.map((child) => (
              <LineageCard key={child.id} feature={child} spawnReason={getSpawnReason(child)} />
            ))}
          </div>
        </div>
      )}
    </section>
  )
}

"use client"

import { useEffect, useMemo, useRef, useState } from 'react'

import { useQuery } from '@tanstack/react-query'

import type { FeatureEvent } from '@life-as-code/db'
import { Button } from '@life-as-code/ui'
import { EventType, LIFECYCLE_STAGES } from '@life-as-code/validators'

import { useTRPC } from '@/trpc/react'
import { STAGE_LABEL } from '@/lib/stage-labels'
import { formatRelativeTime } from '@/lib/format-relative-time'

const EVENT_LABEL: Record<string, string> = {
  [EventType.FEATURE_CREATED]: 'Feature created',
  [EventType.FEATURE_UPDATED]: 'Feature updated',
  [EventType.FEATURE_FROZEN]: 'Feature frozen',
  [EventType.FEATURE_SPAWNED]: 'Child feature spawned',
  [EventType.STAGE_UPDATED]: 'Stage updated',
  [EventType.ANNOTATION_ADDED]: 'Annotation added',
  [EventType.SCHEMA_UPDATED]: 'Schema updated',
}

function describeEvent(eventType: string, changedFields: unknown): string {
  const fields = (changedFields ?? {}) as Record<string, unknown>

  switch (eventType) {
    case EventType.FEATURE_CREATED:
      return 'Feature created'
    case EventType.FEATURE_FROZEN:
      return 'Feature frozen'
    case EventType.FEATURE_SPAWNED:
      return typeof fields.childId === 'string'
        ? 'Child feature spawned'
        : 'Spawned from parent feature'
    case EventType.STAGE_UPDATED: {
      const stage = typeof fields.stage === 'string' ? fields.stage : null
      return stage ? `Stage updated: ${(STAGE_LABEL as Record<string, string>)[stage] ?? stage}` : 'Stage updated'
    }
    case EventType.ANNOTATION_ADDED:
      return 'Annotation added'
    case EventType.SCHEMA_UPDATED:
      return 'Schema updated'
    case EventType.FEATURE_UPDATED: {
      if (Array.isArray(fields.changedKeys) && fields.changedKeys.length > 0) {
        return `Updated: ${(fields.changedKeys as string[]).join(', ')}`
      }
      const sc = fields.statusChange as { from?: string; to?: string } | undefined
      if (sc?.from && sc?.to) {
        return `Status changed: ${sc.from} → ${sc.to}`
      }
      if (fields.updatedViaJson === true) {
        return 'Updated via JSON editor'
      }
      return 'Feature updated'
    }
    default:
      return 'Event recorded'
  }
}

interface AuditHistoryProps {
  featureId: string
}

export function AuditHistory({ featureId }: AuditHistoryProps) {
  const trpc = useTRPC()
  const [allEvents, setAllEvents] = useState<FeatureEvent[]>([])
  const [cursor, setCursor] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const cursorRef = useRef(-1)

  const { data, isPending, isFetching } = useQuery(
    trpc.events.listFeatureEvents.queryOptions({ id: featureId, cursor }),
  )

  useEffect(() => {
    if (!data || cursor === cursorRef.current) return
    cursorRef.current = cursor
    setAllEvents((prev) => (cursor === 0 ? data.events : [...prev, ...data.events]))
    setHasMore(data.hasMore)
  }, [data, cursor])

  function handleLoadMore() {
    if (data?.nextCursor !== null && data?.nextCursor !== undefined) {
      setCursor(data.nextCursor)
    }
  }

  // Extract completeness data points from events — memoised to avoid re-running on every render
  const completenessPoints = useMemo<{ label: string; value: number }[]>(() => {
    if (allEvents.length === 0) return []
    const totalStages = LIFECYCLE_STAGES.length
    let stagesFilled = 0
    const points: { label: string; value: number }[] = []
    for (const event of [...allEvents].reverse()) {
      if (event.eventType === EventType.STAGE_UPDATED || event.eventType === EventType.FEATURE_CREATED) {
        stagesFilled = Math.min(stagesFilled + 1, totalStages)
        const pct = Math.round((stagesFilled / totalStages) * 100)
        points.push({ label: formatRelativeTime(event.createdAt), value: pct })
      }
    }
    return points
  }, [allEvents])

  // Loading skeleton
  if (isPending && allEvents.length === 0) {
    return (
      <div className="flex flex-col gap-3">
        <div className="animate-pulse bg-muted rounded h-12" />
        <div className="animate-pulse bg-muted rounded h-12" />
        <div className="animate-pulse bg-muted rounded h-12" />
      </div>
    )
  }

  // Empty state
  if (allEvents.length === 0 && !isPending) {
    return <p className="text-sm text-muted-foreground">No history recorded yet.</p>
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Completeness sparkline */}
      {completenessPoints.length > 1 && (
        <div className="rounded-lg border border-border p-3">
          <p className="text-xs font-medium text-muted-foreground mb-2">Completeness over time</p>
          <div className="flex items-end gap-1 h-12" aria-label="Completeness chart">
            {completenessPoints.map((pt, i) => (
              <div key={i} className="flex flex-col items-center gap-1 flex-1">
                <div
                  className="w-full bg-primary/70 rounded-sm"
                  style={{ height: `${Math.max(4, pt.value * 0.48)}px` }}
                  title={`${pt.label}: ${pt.value}%`}
                  aria-label={`${pt.label}: ${pt.value}%`}
                />
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-1 text-right">
            {completenessPoints[completenessPoints.length - 1]?.value ?? 0}% complete
          </p>
        </div>
      )}

      <ol role="list" className="flex flex-col gap-4">
        {allEvents.map((event) => (
          <li role="listitem" key={event.id} className="flex flex-col gap-1 rounded-lg border border-border p-3">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
                {EVENT_LABEL[event.eventType] ?? event.eventType}
              </span>
            </div>
            <p className="text-sm text-foreground">
              {describeEvent(event.eventType, event.changedFields)}
            </p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{event.actor}</span>
              <span aria-hidden="true">·</span>
              <time
                dateTime={event.createdAt.toISOString()}
                title={event.createdAt.toISOString()}
              >
                {formatRelativeTime(event.createdAt)}
              </time>
            </div>
          </li>
        ))}
      </ol>
      {hasMore && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isFetching}
          onClick={handleLoadMore}
        >
          {isFetching ? 'Loading…' : 'Load more'}
        </Button>
      )}
    </div>
  )
}

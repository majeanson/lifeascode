"use client"

import { useState } from 'react'

import { LIFECYCLE_STAGES } from '@life-as-code/validators'
import type { DecisionEntry } from '@life-as-code/validators'
import type { Feature } from '@life-as-code/db'

import { STAGE_FIELD_CONFIGS } from '@/components/wizard/stage-fields'
import { DecisionLogEntry } from '@/components/wizard/decision-log-entry'

type ContentMap = Record<string, Record<string, unknown>> | undefined

const STAGE_LABEL: Record<string, string> = {
  problem: 'Problem',
  analysis: 'Analysis',
  requirements: 'Requirements',
  design: 'Design',
  implementation: 'Implementation',
  validation: 'Validation',
  documentation: 'Documentation',
  delivery: 'Delivery',
  support: 'Support',
}

function hasStageContent(contentMap: ContentMap, stage: string): boolean {
  const s = contentMap?.[stage]
  return !!(s && Object.values(s).some((v) => typeof v === 'string' && v.trim().length > 0))
}

interface ProvenanceChainProps {
  feature: Feature
}

export function ProvenanceChain({ feature }: ProvenanceChainProps) {
  const contentMap = feature.content as ContentMap

  const [expanded, setExpanded] = useState<Set<string>>(() => {
    const initial = new Set<string>()
    for (const stage of LIFECYCLE_STAGES) {
      if (hasStageContent(contentMap, stage)) {
        initial.add(stage)
      }
    }
    return initial
  })

  const toggleStage = (stage: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(stage)) {
        next.delete(stage)
      } else {
        next.add(stage)
      }
      return next
    })
  }

  return (
    <ol role="list" className="relative flex flex-col gap-0 py-2">
      {LIFECYCLE_STAGES.map((stage, index) => {
        const stageData = contentMap?.[stage] as Record<string, unknown> | undefined
        const decisions = (stageData?.decisions as DecisionEntry[]) ?? []
        const hasContent = hasStageContent(contentMap, stage)
        const isExpanded = expanded.has(stage)
        const isLast = index === LIFECYCLE_STAGES.length - 1
        const label = STAGE_LABEL[stage] ?? stage

        return (
          <li
            key={stage}
            role="listitem"
            aria-label={`Stage: ${label} — ${hasContent ? 'complete' : 'not started'}`}
            className="relative flex gap-4"
          >
            {/* Connector line + dot column */}
            <div className="flex flex-col items-center">
              <span
                className={`mt-1 h-3 w-3 shrink-0 rounded-full border-2 ${
                  hasContent
                    ? 'border-primary bg-primary'
                    : 'border-muted-foreground bg-transparent'
                }`}
              />
              {!isLast && <span className="mt-1 w-0.5 flex-1 bg-border" />}
            </div>

            {/* Stage content */}
            <div className="mb-6 min-w-0 flex-1">
              {/* Stage header */}
              <div className="flex items-center justify-between pb-1">
                <span className="text-sm font-medium text-foreground">{label}</span>
                <button
                  type="button"
                  onClick={() => { toggleStage(stage) }}
                  className="text-xs text-muted-foreground transition-colors hover:text-foreground"
                  aria-label={isExpanded ? `Collapse ${label}` : `Expand ${label}`}
                >
                  {isExpanded ? '▼' : '►'}
                </button>
              </div>

              {/* Expanded content */}
              {isExpanded && (
                <div className="flex flex-col gap-3 rounded-md border border-border bg-muted/30 px-4 py-3">
                  {/* Field values */}
                  {(STAGE_FIELD_CONFIGS[stage] ?? []).map((field) => {
                    const value = stageData?.[field.key]
                    if (typeof value !== 'string' || !value.trim()) return null
                    return (
                      <div key={field.key}>
                        <p className="mb-0.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          {field.label}
                        </p>
                        <p className="whitespace-pre-wrap text-sm text-foreground">{value}</p>
                      </div>
                    )
                  })}

                  {/* Decisions */}
                  {decisions.length > 0 && (
                    <div className="flex flex-col gap-3 border-t border-border pt-3">
                      {decisions.map((d) => (
                        <DecisionLogEntry key={d.id} entry={d} />
                      ))}
                    </div>
                  )}

                  {/* Empty state */}
                  {!hasContent && decisions.length === 0 && (
                    <p className="italic text-sm text-muted-foreground">Not yet documented</p>
                  )}
                </div>
              )}

              {/* Collapsed empty state */}
              {!isExpanded && !hasContent && (
                <p className="text-xs italic text-muted-foreground">Not yet documented</p>
              )}
            </div>
          </li>
        )
      })}
    </ol>
  )
}

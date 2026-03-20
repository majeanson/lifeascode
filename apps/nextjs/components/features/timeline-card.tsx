"use client"

import Link from 'next/link'

import { FeatureStateBadge } from './feature-state-badge'
import { ScoreBadge } from './score-badge'

interface TimelineCardProps {
  id: string
  title: string
  status: 'active' | 'draft' | 'frozen' | 'flagged'
  frozen: boolean
  score: number | null
  hasParent: boolean
  hasChildren: boolean
}

export function TimelineCard({ id, title, status, frozen, score, hasParent, hasChildren }: TimelineCardProps) {
  let lineageIndicator: string | null = null
  if (hasParent && hasChildren) lineageIndicator = '↳⊕'
  else if (hasParent) lineageIndicator = '↳'
  else if (hasChildren) lineageIndicator = '⊕'

  return (
    <Link href={`/features/${id}`}>
      <div className="rounded border border-border p-3 hover:border-primary/50 transition-colors cursor-pointer">
        <p className="truncate text-sm font-medium">
          {frozen ? '❄ ' : ''}{title}
        </p>
        <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
          <FeatureStateBadge status={status} frozen={frozen} variant="compact" />
          <ScoreBadge score={score} />
          {lineageIndicator !== null && (
            <span className="text-xs text-muted-foreground font-mono">{lineageIndicator}</span>
          )}
        </div>
      </div>
    </Link>
  )
}

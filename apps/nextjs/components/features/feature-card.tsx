import { memo } from 'react'

import Link from 'next/link'

import { LIFECYCLE_STAGES } from '@life-as-code/validators'

import { formatRelativeTime } from '@/lib/format-relative-time'
import { getContentMap, getTags, countFilledStages } from '@/lib/feature-content'

import { FeatureStateBadge } from './feature-state-badge'
import { ScoreBadge } from './score-badge'
import { StageCompletionIndicator } from './stage-completion-indicator'

interface FeatureCardProps {
  feature: {
    id: string
    featureKey: string
    status: 'active' | 'draft' | 'frozen' | 'flagged'
    frozen: boolean
    score: number | null
    content: unknown
    updatedAt: Date
  }
}

export const FeatureCard = memo(function FeatureCard({ feature }: FeatureCardProps) {
  const contentMap = getContentMap(feature.content)

  const title = (contentMap?.problem?.problemStatement as string | undefined) ?? 'Untitled'
  const tags = getTags(feature.content)
  const completedStages = countFilledStages(feature.content)

  const state = feature.frozen ? 'frozen' : feature.status
  const extraTagCount = tags.length > 3 ? tags.length - 3 : 0

  return (
    <article
      role="article"
      aria-label={`${title} — ${state}`}
      className="rounded-lg border border-border bg-card p-4 hover:border-primary transition-colors"
    >
      {/* Links to the detail view — the Edit tab lives there now */}
      <Link href={`/features/${feature.id}`} className="block">
        {/* Header row: key + score badge + status badge */}
        <div className="flex items-center justify-between">
          <span className="font-mono text-xs text-muted-foreground">{feature.featureKey}</span>
          <div className="flex items-center gap-2">
            <ScoreBadge score={feature.score ?? null} />
            <FeatureStateBadge status={feature.status} frozen={feature.frozen} />
          </div>
        </div>

        {/* Title */}
        <p className="mt-1 text-sm font-medium line-clamp-2">{title}</p>

        {/* Stage completion pips */}
        <div className="mt-2">
          <StageCompletionIndicator completedStages={completedStages} totalStages={LIFECYCLE_STAGES.length} />
        </div>

        {/* Metadata footer */}
        <div className="mt-2 flex items-center gap-2 flex-wrap">
          <time
            dateTime={feature.updatedAt.toISOString()}
            title={feature.updatedAt.toISOString()}
            className="text-xs text-muted-foreground"
          >
            {formatRelativeTime(feature.updatedAt)}
          </time>
          {tags.slice(0, 3).map((tag) => (
            <span key={tag} className="rounded-full bg-muted px-2 py-0.5 text-xs">
              {tag}
            </span>
          ))}
          {extraTagCount > 0 && (
            <span className="text-xs text-muted-foreground">+{extraTagCount} more</span>
          )}
        </div>
      </Link>
    </article>
  )
})

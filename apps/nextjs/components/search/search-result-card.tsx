import type { SearchResultItem } from '@life-as-code/validators'

import { FeatureStateBadge } from '@/components/features/feature-state-badge'

interface SearchResultCardProps {
  result: SearchResultItem
  isActive: boolean
  onSelect: () => void
}

export function SearchResultCard({ result, isActive, onSelect }: SearchResultCardProps) {
  const stageLabel = result.matchedStage
    ? `Match in ${result.matchedStage} stage`
    : undefined

  return (
    <div
      role="option"
      aria-selected={isActive}
      aria-label={`${result.title}${stageLabel ? ` — ${stageLabel}` : ''}`}
      className={`flex cursor-pointer flex-col gap-1 px-4 py-3 transition-colors ${
        isActive
          ? 'bg-accent text-accent-foreground'
          : 'hover:bg-muted'
      }`}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onSelect()
        }
      }}
      tabIndex={-1}
    >
      <div className="flex items-center gap-2">
        <span className="font-mono text-xs text-muted-foreground">{result.featureKey}</span>
        <FeatureStateBadge status={result.status} frozen={result.frozen} variant="compact" />
        {result.matchedStage && (
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
            {result.matchedStage}
          </span>
        )}
      </div>
      <p className="text-sm font-medium line-clamp-1">{result.title}</p>
      {result.snippet && (
        <span
          className="text-xs text-muted-foreground line-clamp-2 [&_mark]:bg-transparent [&_mark]:font-semibold [&_mark]:underline"
          // Safe: snippet HTML comes from our own PostgreSQL ts_headline() with only <mark> tags
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: result.snippet }}
        />
      )}
    </div>
  )
}

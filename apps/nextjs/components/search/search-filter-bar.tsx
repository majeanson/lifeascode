"use client"

import { LIFECYCLE_STAGES } from '@life-as-code/validators'

export type SortOption = 'updated' | 'created' | 'stage' | 'id'

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'updated', label: 'Last updated' },
  { value: 'created', label: 'Created' },
  { value: 'stage', label: 'Stage' },
  { value: 'id', label: 'ID' },
]

interface SearchFilterBarProps {
  activeStages: string[]
  onStagesChange: (stages: string[]) => void
  activeSort: SortOption
  onSortChange: (sort: SortOption) => void
}

export function SearchFilterBar({
  activeStages,
  onStagesChange,
  activeSort,
  onSortChange,
}: SearchFilterBarProps) {
  const allActive = activeStages.length === 0

  function toggleStage(stage: string) {
    if (activeStages.includes(stage)) {
      onStagesChange(activeStages.filter((s) => s !== stage))
    } else {
      onStagesChange([...activeStages, stage])
    }
  }

  return (
    <div className="flex flex-col gap-3 border-b border-border px-4 py-3">
      {/* Stage filter pills */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-xs text-muted-foreground">Stage:</span>
        <button
          type="button"
          onClick={() => onStagesChange([])}
          className={`rounded-full px-3 py-0.5 text-xs transition-colors ${
            allActive
              ? 'bg-accent text-accent-foreground border border-accent'
              : 'border border-border text-muted-foreground hover:bg-muted'
          }`}
        >
          All
        </button>
        {LIFECYCLE_STAGES.map((stage) => {
          const isActive = activeStages.includes(stage)
          return (
            <button
              key={stage}
              type="button"
              onClick={() => toggleStage(stage)}
              className={`rounded-full px-3 py-0.5 text-xs transition-colors ${
                isActive
                  ? 'bg-accent text-accent-foreground border border-accent'
                  : 'border border-border text-muted-foreground hover:bg-muted'
              }`}
            >
              {stage}
            </button>
          )
        })}
      </div>

      {/* Sort */}
      <div className="flex items-center gap-2">
        <label htmlFor="search-sort" className="text-xs text-muted-foreground">
          Sort:
        </label>
        <select
          id="search-sort"
          value={activeSort}
          onChange={(e) => onSortChange(e.target.value as SortOption)}
          className="rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}

"use client"

import { useEffect, useRef, useState, useTransition } from 'react'

import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'

import { LIFECYCLE_STAGES } from '@life-as-code/validators'
import type { SearchResultItem } from '@life-as-code/validators'

import { useDebounce } from '@/hooks/use-debounce'
import { useTRPC } from '@/trpc/react'

import { type SortOption, SearchFilterBar } from './search-filter-bar'
import { SearchResultCard } from './search-result-card'

function getInitialSort(): SortOption {
  if (typeof window === 'undefined') return 'updated'
  return (localStorage.getItem('lac-search-sort') as SortOption | null) ?? 'updated'
}

function sortResults(results: SearchResultItem[], sort: SortOption): SearchResultItem[] {
  switch (sort) {
    case 'updated':
      return results.toSorted((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
    case 'created':
      // No createdAt in SearchResultItem — use featureKey as sequential proxy
      return results.toSorted((a, b) => a.featureKey.localeCompare(b.featureKey))
    case 'stage':
      return results.toSorted((a, b) => {
        if (a.matchedStage === null && b.matchedStage === null) return 0
        if (a.matchedStage === null) return 1
        if (b.matchedStage === null) return -1
        return a.matchedStage.localeCompare(b.matchedStage)
      })
    case 'id':
      return results.toSorted((a, b) => a.featureKey.localeCompare(b.featureKey))
    default:
      return results
  }
}

export function SearchPageClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [, startTransition] = useTransition()
  const trpc = useTRPC()

  // Initialize state from URL params
  const [query, setQuery] = useState(searchParams.get('q') ?? '')
  const [activeStages, setActiveStages] = useState<string[]>(
    searchParams.get('stage')?.split(',').filter(Boolean) ?? [],
  )
  const [sort, setSort] = useState<SortOption>(
    (searchParams.get('sort') as SortOption | null) ?? getInitialSort(),
  )

  const debouncedQuery = useDebounce(query, 300)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Focus search input on mount (replaces autoFocus to satisfy a11y lint)
  useEffect(() => {
    searchInputRef.current?.focus()
  }, [])

  // Persist sort to localStorage
  useEffect(() => {
    localStorage.setItem('lac-search-sort', sort)
  }, [sort])

  // Sync URL params when filters change
  function updateUrl(newQ: string, newStages: string[], newSort: SortOption) {
    const params = new URLSearchParams()
    if (newQ) params.set('q', newQ)
    if (newStages.length > 0) params.set('stage', newStages.join(','))
    if (newSort !== 'updated') params.set('sort', newSort)
    startTransition(() => {
      router.replace(`/search?${params.toString()}`)
    })
  }

  function handleQueryChange(newQ: string) {
    setQuery(newQ)
    updateUrl(newQ, activeStages, sort)
  }

  function handleStagesChange(newStages: string[]) {
    setActiveStages(newStages)
    updateUrl(query, newStages, sort)
  }

  function handleSortChange(newSort: SortOption) {
    setSort(newSort)
    updateUrl(query, activeStages, newSort)
  }

  function clearFilters() {
    setQuery('')
    setActiveStages([])
    setSort('updated')
    startTransition(() => {
      router.replace('/search')
    })
  }

  // Build filters object: only pass stage filter if exactly one stage is active
  // (search.fullText accepts a single stage filter — multi-stage is client-filtered)
  const singleStage =
    activeStages.length === 1 && LIFECYCLE_STAGES.includes(activeStages[0] as typeof LIFECYCLE_STAGES[number])
      ? (activeStages[0] as typeof LIFECYCLE_STAGES[number])
      : undefined

  const { data: rawResults, isLoading, isFetching } = useQuery({
    ...trpc.search.fullText.queryOptions({
      query: debouncedQuery,
      filters: singleStage ? { stage: singleStage } : undefined,
      limit: 50,
    }),
    enabled: debouncedQuery.length > 0,
    retry: 1,
  })

  // Client-side sort + multi-stage filter
  const results: SearchResultItem[] = (() => {
    if (!rawResults) return []
    let filtered = rawResults
    // If multiple stages active, filter client-side (single-stage is pushed to backend)
    if (activeStages.length > 1) {
      filtered = filtered.filter(
        (r): r is SearchResultItem =>
          r.matchedStage !== null && activeStages.includes(r.matchedStage),
      )
    }
    return sortResults(filtered, sort)
  })()

  const showEmpty = debouncedQuery.length > 0 && !isLoading && results.length === 0
  const hasActiveFilters = query.length > 0 || activeStages.length > 0

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <h1 className="mb-4 text-2xl font-bold">Search</h1>

      {/* Search input */}
      <div className="mb-4 flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2">
        <svg
          className="h-4 w-4 shrink-0 text-muted-foreground"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
        <input
          type="text"
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          placeholder="Search features by concept, stage, or tag..."
          value={query}
          onChange={(e) => handleQueryChange(e.target.value)}
          ref={searchInputRef}
          aria-label="Search query"
        />
        {query && (
          <button
            type="button"
            onClick={() => handleQueryChange('')}
            className="text-muted-foreground hover:text-foreground"
            aria-label="Clear search"
          >
            ✕
          </button>
        )}
      </div>

      {/* Filter bar */}
      <div className="mb-4 rounded-lg border border-border bg-background overflow-hidden">
        <SearchFilterBar
          activeStages={activeStages}
          onStagesChange={handleStagesChange}
          activeSort={sort}
          onSortChange={handleSortChange}
        />
      </div>

      {/* Results / states */}
      {query === '' && (
        <div className="py-12 text-center text-muted-foreground">
          <p className="text-sm">Enter a search term to find features</p>
          <p className="mt-1 text-xs">Search by concept, stage name, tags, or feature ID</p>
        </div>
      )}

      {query !== '' && isFetching && (
        <div className="h-0.5 w-full overflow-hidden rounded bg-muted">
          <div className="h-full animate-pulse bg-primary/60" />
        </div>
      )}

      {query !== '' && isLoading && (
        <div className="flex flex-col gap-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-20 rounded-lg border border-border bg-muted animate-pulse" />
          ))}
        </div>
      )}

      {showEmpty && (
        <div className="py-12 text-center">
          <p className="text-sm text-muted-foreground">
            No features match &ldquo;<span className="font-medium">{query}</span>&rdquo;
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Try broader terms or fewer filters</p>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="mt-3 text-xs text-primary underline hover:no-underline"
            >
              Clear filters
            </button>
          )}
        </div>
      )}

      {results.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-xs text-muted-foreground">
            {results.length} result{results.length === 1 ? '' : 's'}
          </p>
          <ul role="list" className="flex flex-col gap-2">
            {results.map((result) => (
              <li key={result.id}>
                <Link
                  href={`/features/${result.id}/wizard`}
                  className="block rounded-lg border border-border bg-background overflow-hidden hover:border-primary transition-colors no-underline"
                >
                  <SearchResultCard
                    result={result}
                    isActive={false}
                    onSelect={() => {}}
                  />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

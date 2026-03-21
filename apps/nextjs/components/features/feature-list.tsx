"use client"

import { useEffect, useRef, useState } from 'react'
import { useInfiniteQuery } from '@tanstack/react-query'
import { useVirtualizer } from '@tanstack/react-virtual'
import Link from 'next/link'

import { Github } from 'lucide-react'
import { buttonVariants } from '@life-as-code/ui'

import { useTRPCClient } from '@/trpc/react'
import { useDebounce } from '@/hooks/use-debounce'

import { EmptyState } from './empty-state'
import { FeatureCard } from './feature-card'
import { FeatureCardSkeleton } from './feature-card-skeleton'

type StatusFilter = 'all' | 'active' | 'draft' | 'frozen' | 'flagged'
type SourceFilter = 'all' | 'db' | 'github'

const STATUS_PILLS: { key: StatusFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'draft', label: 'Draft' },
  { key: 'frozen', label: 'Frozen' },
  { key: 'flagged', label: 'Flagged' },
]

const SOURCE_PILLS: { key: SourceFilter; label: string }[] = [
  { key: 'all', label: 'All sources' },
  { key: 'db', label: 'DB' },
  { key: 'github', label: 'GitHub' },
]

const PAGE_LIMIT = 25
// Estimated height of a FeatureCard including gap
const CARD_ESTIMATE_PX = 140

export function FeatureList() {
  const trpcClient = useTRPCClient()

  const [rawSearch, setRawSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all')

  const search = useDebounce(rawSearch, 300)

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, isFetching } =
    useInfiniteQuery({
      // Filters in the key — changing them resets the page list automatically
      queryKey: [['features', 'listFeaturesPaginated'], { status: statusFilter, search, source: sourceFilter }] as const,
      queryFn: ({ pageParam }) =>
        trpcClient.features.listFeaturesPaginated.query({
          limit: PAGE_LIMIT,
          cursor: pageParam,
          status: statusFilter !== 'all' ? statusFilter : undefined,
          search: search.trim() || undefined,
        }),
      getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
      initialPageParam: 0,
      select: (data) => ({
        ...data,
        pages: data.pages.map((page) => ({
          ...page,
          features: page.features.filter((f) => {
            if (sourceFilter === 'github') return !!f.githubSourceId
            if (sourceFilter === 'db') return !f.githubSourceId
            return true
          }),
        })),
      }),
    })

  const allFeatures = data?.pages.flatMap((p) => p.features) ?? []
  const total = data?.pages[0]?.total ?? 0

  // ── Virtual scrolling ──────────────────────────────────────────────────────
  const scrollRef = useRef<HTMLDivElement>(null)

  const rowVirtualizer = useVirtualizer({
    count: allFeatures.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => CARD_ESTIMATE_PX,
    overscan: 5,
  })

  // ── Auto-fetch next page when scrolled near the bottom of the container ───
  // Using scroll event (not IntersectionObserver) because the sentinel would be
  // outside the fixed-height scroll container and always visible.
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    function onScroll() {
      if (!el) return
      const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 300
      if (nearBottom && hasNextPage && !isFetchingNextPage) {
        void fetchNextPage()
      }
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => { el.removeEventListener('scroll', onScroll) }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  if (isLoading) {
    return (
      <section>
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-lg font-semibold">Features</h1>
          <div className="h-8 w-24 animate-pulse rounded-md bg-muted" />
        </div>
        <div className="mb-3 h-9 w-full animate-pulse rounded-md bg-muted" />
        <div className="mb-4 flex gap-1">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="h-6 w-14 animate-pulse rounded-full bg-muted" />
          ))}
        </div>
        <ul role="list" className="flex flex-col gap-3">
          {[0, 1, 2, 3, 4].map((i) => (
            <li key={i}><FeatureCardSkeleton /></li>
          ))}
        </ul>
      </section>
    )
  }

  const virtualItems = rowVirtualizer.getVirtualItems()

  return (
    <section>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-semibold">
          Features
          {total > 0 && (
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              ({total.toLocaleString()})
            </span>
          )}
        </h1>
        <Link href="/features/new" className={buttonVariants({ size: 'sm' })}>
          + New Feature
        </Link>
      </div>

      {/* Search bar */}
      <div className="mb-3">
        <input
          type="search"
          value={rawSearch}
          onChange={(e) => { setRawSearch(e.target.value) }}
          placeholder="Search by key, title, or tag…"
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          aria-label="Search features"
        />
      </div>

      {/* Status pills */}
      <div className="mb-2 flex flex-wrap gap-1" role="group" aria-label="Filter by status">
        {STATUS_PILLS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => { setStatusFilter(key) }}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              statusFilter === key
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
            aria-pressed={statusFilter === key}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Source pills */}
      <div className="mb-4 flex flex-wrap gap-1" role="group" aria-label="Filter by source">
        {SOURCE_PILLS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => { setSourceFilter(key) }}
            className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              sourceFilter === key
                ? 'bg-secondary text-secondary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
            aria-pressed={sourceFilter === key}
          >
            {key === 'github' && <Github className="h-3 w-3" />}
            {label}
          </button>
        ))}
      </div>

      {/* Results */}
      {allFeatures.length === 0 && !isFetching ? (
        total === 0 && !search.trim() && statusFilter === 'all' ? (
          <EmptyState
            icon={<span>🗂️</span>}
            title="No features yet"
            description="Run lac init in any directory to document your first feature."
            action={{ label: 'Create your first feature', href: '/features/new' }}
            className="py-16"
          />
        ) : (
          <EmptyState
            icon={<span>🔍</span>}
            title="No features match that search"
            description="Try different keywords or clear the filter."
            className="py-16"
          />
        )
      ) : (
        <div className="flex flex-col gap-2">
          {/* Virtualised list — fixed-height scroll container */}
          <div
            ref={scrollRef}
            className="overflow-y-auto"
            style={{ height: Math.min(rowVirtualizer.getTotalSize() + 16, 800) }}
          >
            <ul
              role="list"
              style={{ height: rowVirtualizer.getTotalSize(), position: 'relative' }}
            >
              {virtualItems.map((virtualRow) => {
                const feature = allFeatures[virtualRow.index]
                if (!feature) return null
                return (
                  <li
                    key={feature.id}
                    data-index={virtualRow.index}
                    ref={rowVirtualizer.measureElement}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      transform: `translateY(${virtualRow.start}px)`,
                      paddingBottom: '12px',
                    }}
                  >
                    <FeatureCard feature={feature} />
                  </li>
                )
              })}
            </ul>
          </div>

          {/* Loading more indicator */}
          {isFetchingNextPage && (
            <ul role="list" className="flex flex-col gap-3 mt-1">
              {[0, 1].map((i) => <li key={i}><FeatureCardSkeleton /></li>)}
            </ul>
          )}

          {/* End of list */}
          {!isFetchingNextPage && !hasNextPage && allFeatures.length > 0 && (
            <p className="text-center text-xs text-muted-foreground py-2">
              Showing all {allFeatures.length.toLocaleString()} features
            </p>
          )}
        </div>
      )}
    </section>
  )
}

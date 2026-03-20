"use client"

import { useEffect, useRef, useState } from 'react'

import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'

import type { SearchResultItem } from '@life-as-code/validators'

import { useDebounce } from '@/hooks/use-debounce'
import { FeatureCardSkeleton } from '@/components/features/feature-card-skeleton'
import { useSearchStore } from '@/stores/search-store'
import { useTRPC } from '@/trpc/react'

import { SearchResultCard } from './search-result-card'

export function SearchOverlay() {
  const isOpen = useSearchStore((s) => s.isOpen)
  const open = useSearchStore((s) => s.open)
  const close = useSearchStore((s) => s.close)

  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const trpc = useTRPC()

  const debouncedQuery = useDebounce(query, 300)

  // Recent features (shown when query is empty) — uses slim listRecent (6 rows, no full content)
  const { data: recentData, isLoading: recentLoading } = useQuery({
    ...trpc.features.listRecent.queryOptions(),
    enabled: isOpen,
  })

  // Search results (shown when query has content)
  const { data: searchData, isLoading: searchLoading } = useQuery({
    ...trpc.search.fullText.queryOptions({ query: debouncedQuery, limit: 20 }),
    enabled: debouncedQuery.length > 0,
    retry: 1,
  })

  // Show loading when: fetching recent (empty query), fetching search results,
  // or waiting for debounce to fire (query typed but not yet sent)
  const isLoading = query === '' ? recentLoading : (searchLoading || debouncedQuery !== query)

  // Map listRecent results to SearchResultItem shape — title/problem already extracted server-side
  const recentResults: SearchResultItem[] = (recentData ?? []).slice(0, 5).map((f) => ({
    id: f.id,
    featureKey: f.featureKey,
    title: f.title || f.problem || f.featureKey,
    status: f.status,
    frozen: f.frozen,
    matchedStage: null,
    snippet: '',
    updatedAt: f.updatedAt,
  }))

  const results: SearchResultItem[] = query === '' ? recentResults : (searchData ?? [])

  // Global Cmd+K / Ctrl+K listener — named distinctly to avoid shadowing
  useEffect(() => {
    function handleGlobalKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        if (!isOpen) {
          open(document.activeElement as HTMLElement)
        }
      }
    }
    document.addEventListener('keydown', handleGlobalKeyDown)
    return () => document.removeEventListener('keydown', handleGlobalKeyDown)
  }, [isOpen, open])

  // Auto-focus input when overlay opens; reset state on close
  useEffect(() => {
    if (isOpen) {
      setQuery('')
      setActiveIndex(0)
      // Small delay to ensure DOM is ready
      setTimeout(() => inputRef.current?.focus(), 10)
    }
  }, [isOpen])

  // Reset active index when results change
  useEffect(() => {
    setActiveIndex(0)
  }, [results.length])

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => (results.length > 0 ? (i + 1) % results.length : 0))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => (results.length > 0 ? (i - 1 + results.length) % results.length : 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const active = results[activeIndex]
      if (active) {
        router.push(`/features/${active.id}/wizard`)
        close()
      }
    } else if (e.key === 'Escape') {
      e.preventDefault()
      close()
    }
  }

  function handleSelect(result: SearchResultItem) {
    router.push(`/features/${result.id}/wizard`)
    close()
  }

  if (!isOpen) return null

  const showEmpty = debouncedQuery.length > 0 && !isLoading && results.length === 0

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 pt-[15vh]"
      onClick={(e) => {
        if (e.target === e.currentTarget) close()
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') close()
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Search features"
    >
      {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions */}
      <div
        className="w-full max-w-xl overflow-hidden rounded-xl border border-border bg-background shadow-2xl"
        onKeyDown={handleKeyDown}
      >
        {/* Search input */}
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
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
            ref={inputRef}
            type="text"
            role="combobox"
            aria-expanded={results.length > 0}
            aria-controls="search-results"
            aria-autocomplete="list"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            placeholder="Search features..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <kbd className="hidden rounded border border-border px-1.5 py-0.5 text-xs text-muted-foreground sm:inline">
            Esc
          </kbd>
        </div>

        {/* Results / loading / empty */}
        <div
          id="search-results"
          role="listbox"
          aria-label="Search results"
          className="max-h-96 overflow-y-auto"
        >
          {isLoading && (
            <div className="flex flex-col gap-2 p-3">
              {[0, 1, 2].map((i) => (
                <FeatureCardSkeleton key={i} />
              ))}
            </div>
          )}

          {!isLoading && results.length > 0 && (
            <>
              {query === '' && (
                <p className="px-4 py-2 text-xs font-medium text-muted-foreground">Recent features</p>
              )}
              {results.map((result, i) => (
                <SearchResultCard
                  key={result.id}
                  result={result}
                  isActive={i === activeIndex}
                  onSelect={() => handleSelect(result)}
                />
              ))}
            </>
          )}

          {showEmpty && (
            <div className="px-4 py-8 text-center">
              <p className="text-sm text-muted-foreground">
                No features match &ldquo;<span className="font-medium">{query}</span>&rdquo;
              </p>
              <p className="mt-1 text-xs text-muted-foreground">Try a different or broader term</p>
            </div>
          )}

          {!isLoading && query === '' && results.length === 0 && !recentLoading && (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">No features yet</p>
          )}
        </div>

        {/* Footer hint */}
        <div className="border-t border-border px-4 py-2 text-xs text-muted-foreground flex gap-3">
          <span><kbd className="rounded border border-border px-1">↑↓</kbd> navigate</span>
          <span><kbd className="rounded border border-border px-1">↵</kbd> open</span>
          <span><kbd className="rounded border border-border px-1">Esc</kbd> close</span>
        </div>
      </div>
    </div>
  )
}

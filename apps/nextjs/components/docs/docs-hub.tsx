"use client"

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'

import { useTRPC } from '@/trpc/react'

const DOC_FEATURE_KEYS = new Set([
  'feat-2026-008',
  'feat-2026-009',
  'feat-2026-010',
  'feat-2026-011',
])

const DOC_ORDER = ['feat-2026-008', 'feat-2026-009', 'feat-2026-010', 'feat-2026-011']

interface DocCardProps {
  id: string
  featureKey: string
  title: string
  problem: string
  tags: string[]
}

function DocCard({ id, featureKey, title, problem, tags }: DocCardProps) {
  return (
    <article
      role="article"
      aria-label={title}
      className="rounded-lg border border-border bg-card p-5 hover:border-primary transition-colors flex flex-col gap-3"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-mono text-xs text-muted-foreground mb-1">{featureKey}</p>
          <h2 className="text-base font-semibold text-foreground">{title}</h2>
        </div>
        <Link
          href={`/features/${id}/guide`}
          className="shrink-0 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          aria-label={`Read ${title}`}
        >
          Read
        </Link>
      </div>

      <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">{problem}</p>

      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {tags.slice(0, 4).map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </article>
  )
}

export function DocsHub() {
  const trpc = useTRPC()
  const { data, isLoading } = useQuery(trpc.features.listFeatures.queryOptions({ limit: 500 }))

  const docFeatures = useMemo(() => {
    if (!data) return []

    const matched = data.filter((f) => {
      if (DOC_FEATURE_KEYS.has(f.featureKey)) return true
      const contentMap = f.content as Record<string, unknown> | undefined
      const tags = Array.isArray(contentMap?.tags) ? (contentMap.tags as string[]) : []
      return tags.includes('documentation')
    })

    return [...matched].sort((a, b) => {
      const ai = DOC_ORDER.indexOf(a.featureKey)
      const bi = DOC_ORDER.indexOf(b.featureKey)
      if (ai !== -1 && bi !== -1) return ai - bi
      if (ai !== -1) return -1
      if (bi !== -1) return 1
      return a.featureKey.localeCompare(b.featureKey)
    })
  }, [data])

  // Always render <section> as the root so server/client render the same root element.
  // The loading skeleton is inside the same tag to prevent hydration mismatches.
  return (
    <section>
      {isLoading ? (
        <div className="flex flex-col gap-4">
          <div className="h-8 w-48 rounded bg-muted animate-pulse" />
          <div className="grid gap-4 sm:grid-cols-2">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-40 rounded-lg border border-border bg-muted animate-pulse" />
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-foreground">Documentation</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Every doc page is a{' '}
              <code className="rounded bg-muted px-1 py-0.5 text-xs font-mono">feature.json</code>{' '}
              file — browsable in the dashboard, exportable as a static site.
            </p>
          </div>

          {docFeatures.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No documentation features found. Tag a feature with{' '}
              <code className="rounded bg-muted px-1 py-0.5 text-xs font-mono">documentation</code>{' '}
              to surface it here.
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {docFeatures.map((f) => {
                const contentMap = f.content as Record<string, unknown> | undefined
                const problemRaw = contentMap?.problem
                const problem = typeof problemRaw === 'string'
                  ? problemRaw
                  : typeof problemRaw === 'object' && problemRaw !== null
                    ? String((problemRaw as Record<string, unknown>).problemStatement ?? '')
                    : ''
                const title = (contentMap?.title as string | undefined) ?? f.featureKey
                const tags = Array.isArray(contentMap?.tags) ? (contentMap.tags as string[]) : []

                return (
                  <DocCard
                    key={f.id}
                    id={f.id}
                    featureKey={f.featureKey}
                    title={title}
                    problem={problem}
                    tags={tags}
                  />
                )
              })}
            </div>
          )}

          <div className="mt-8 rounded-lg border border-border bg-muted/40 p-4">
            <h2 className="text-sm font-semibold text-foreground mb-2">Generate a static docs site</h2>
            <p className="text-xs text-muted-foreground mb-3">
              Export all feature.json files as browsable HTML — no server required.
            </p>
            <pre className="rounded bg-background border border-border px-3 py-2 text-xs font-mono overflow-x-auto">
              lac export --site ./docs/site
            </pre>
          </div>
        </>
      )}
    </section>
  )
}

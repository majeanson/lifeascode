"use client"

import { Suspense } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { Route } from 'next'
import Link from 'next/link'

import { buttonVariants } from '@life-as-code/ui'

import type { RouterOutputs } from '@life-as-code/api'
import { LIFECYCLE_STAGES } from '@life-as-code/validators'
import { useTRPC } from '@/trpc/react'
import { PageHeader } from '@/components/ui/page-header'
import { formatRelativeTime } from '@/lib/format-relative-time'

import { FeatureStateBadge } from './feature-state-badge'
import { ScoreBadge } from './score-badge'
import { StageCompletionIndicator } from './stage-completion-indicator'
import { CompletenessTable } from '@/app/(features)/dashboard/_components/CompletenessTable'
import { DevFortune } from './dev-fortune'

// ── Stat tile ─────────────────────────────────────────────────────────────────

interface StatTileProps {
  value: number | string
  label: string
  href?: Route
  colorClass?: string
}

function StatTile({ value, label, href, colorClass = 'text-foreground' }: StatTileProps) {
  const content = (
    <div className="rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary/50">
      <p className={`text-2xl font-bold tabular-nums ${colorClass}`}>{value}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{label}</p>
    </div>
  )
  if (href) return <Link href={href}>{content}</Link>
  return content
}

// ── Stats section — uses getStats aggregate query ─────────────────────────────

function WorkspaceStats() {
  const trpc = useTRPC()
  const { data: stats } = useQuery(trpc.features.getStats.queryOptions())

  if (!stats || stats.total === 0) return null

  const avgColor =
    stats.avgCompleteness >= 80
      ? 'text-green-600 dark:text-green-400'
      : stats.avgCompleteness >= 40
        ? 'text-yellow-600 dark:text-yellow-400'
        : 'text-red-600 dark:text-red-400'

  return (
    <section aria-label="Workspace stats">
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        Workspace
      </h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatTile value={stats.total} label="total features" href="/features" />
        <StatTile value={stats.active} label="active" href="/features"
          colorClass="text-green-600 dark:text-green-400" />
        <StatTile value={stats.draft} label="draft" href="/features" />
        <StatTile value={`${stats.avgCompleteness}%`} label="avg completeness" colorClass={avgColor} />
        {stats.needsAttention > 0 && (
          <StatTile value={stats.needsAttention} label="need attention"
            colorClass="text-red-600 dark:text-red-400" />
        )}
      </div>
    </section>
  )
}

// ── Recent feature mini-card ─────────────────────────────────────────────────

type RecentFeature = RouterOutputs['features']['listRecent'][number]

function RecentCard({ feature }: { feature: RecentFeature }) {
  const title = feature.title || feature.problem || feature.featureKey
  const completedStages = Math.round((feature.completeness_pct / 100) * LIFECYCLE_STAGES.length)

  return (
    <article className="rounded-lg border border-border bg-card p-4 hover:border-primary transition-colors relative">
      <Link href={`/features/${feature.id}`} className="block">
        <div className="flex items-center justify-between">
          <span className="font-mono text-xs text-muted-foreground">{feature.featureKey}</span>
          <div className="flex items-center gap-2">
            <ScoreBadge score={feature.score ?? null} />
            <FeatureStateBadge status={feature.status} frozen={feature.frozen} />
          </div>
        </div>
        <p className="mt-1 text-sm font-medium line-clamp-2">{title}</p>
        <div className="mt-2">
          <StageCompletionIndicator completedStages={completedStages} totalStages={LIFECYCLE_STAGES.length} />
        </div>
        <div className="mt-2 flex items-center gap-2 flex-wrap">
          <time dateTime={feature.updatedAt.toISOString()}
            className="text-xs text-muted-foreground">
            {formatRelativeTime(feature.updatedAt)}
          </time>
          {feature.tags.slice(0, 3).map((tag) => (
            <span key={tag} className="rounded-full bg-muted px-2 py-0.5 text-xs">{tag}</span>
          ))}
        </div>
      </Link>
    </article>
  )
}

// ── Recent section — uses listRecent (6 rows, slim projection) ────────────────

function RecentSection() {
  const trpc = useTRPC()
  const { data: recent } = useQuery(trpc.features.listRecent.queryOptions())

  if (!recent || recent.length === 0) return null

  return (
    <section aria-label="Recently updated features">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Recently updated
        </h2>
        <Link href="/features" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
          View all →
        </Link>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {recent.map((feature) => (
          <RecentCard key={feature.id} feature={feature} />
        ))}
      </div>
    </section>
  )
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyHome() {
  return (
    <div className="rounded-lg border border-dashed border-border p-8 text-center">
      <p className="text-sm text-muted-foreground">
        No features yet.{' '}
        <span className="font-mono text-xs bg-muted px-1 rounded">lac init</span>{' '}
        in any directory to start.
      </p>
      <Link
        href="/features/new"
        className="mt-3 inline-block rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
      >
        Create your first feature
      </Link>
    </div>
  )
}

function StatsSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i} className="h-20 animate-pulse rounded-lg border border-border bg-muted" />
      ))}
    </div>
  )
}

function RecentSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-32 animate-pulse rounded-lg border border-border bg-muted" />
      ))}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function HomeOverview() {
  const trpc = useTRPC()
  const { data: stats } = useQuery(trpc.features.getStats.queryOptions())

  return (
    <div className="flex flex-col gap-8 p-6">
      <PageHeader
        title="Life as Code"
        description="Feature provenance — every decision, traceable"
        action={
          <Link href="/features/new" className={buttonVariants({ size: 'sm' })}>
            + New Feature
          </Link>
        }
      />

      <DevFortune />

      {/* Stats — stream independently */}
      <Suspense fallback={<StatsSkeleton />}>
        <WorkspaceStats />
      </Suspense>

      {/* Completeness table — already paginated, unchanged */}
      {!stats || stats.total === 0 ? (
        <EmptyHome />
      ) : (
        <section aria-label="Feature completeness">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              All Features
            </h2>
          </div>
          <Suspense
            fallback={
              <div className="flex flex-col gap-2">
                {[0, 1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-10 animate-pulse rounded bg-muted" />
                ))}
              </div>
            }
          >
            <CompletenessTable />
          </Suspense>
        </section>
      )}

      {/* Recent — stream independently */}
      <Suspense fallback={<RecentSkeleton />}>
        <RecentSection />
      </Suspense>
    </div>
  )
}

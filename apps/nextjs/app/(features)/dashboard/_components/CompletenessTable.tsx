"use client"

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'

import { LIFECYCLE_STAGES } from '@life-as-code/validators'

import { useTRPC } from '@/trpc/react'
import { useDebounce } from '@/hooks/use-debounce'

import { CompletenessHistogram } from './CompletenessHistogram'

// ----------------------------------------------------------------
// Types
// ----------------------------------------------------------------

type ViewKey = 'dev' | 'pm' | 'support' | 'user'

const VIEWS: { key: ViewKey; label: string; description: string }[] = [
  { key: 'dev', label: 'Dev', description: 'Completeness & decisions — for engineers' },
  { key: 'pm', label: 'PM', description: 'Status, tags & lineage — for product managers' },
  { key: 'support', label: 'Support', description: 'Problem statements — for support teams' },
  { key: 'user', label: 'User', description: 'Plain-language summaries — for everyone' },
]

type SortField = 'completeness' | 'status' | 'updatedAt' | 'decisions' | null
type SortDir = 'asc' | 'desc'

// ----------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------

function computeCompleteness(content: unknown): number {
  const contentMap = content as Record<string, Record<string, unknown>> | undefined
  if (!contentMap) return 0
  const filled = LIFECYCLE_STAGES.filter((stage) => {
    const s = contentMap[stage]
    return s && Object.values(s).some((v) => typeof v === 'string' && v.trim().length > 0)
  }).length
  return Math.round((filled / LIFECYCLE_STAGES.length) * 100)
}

function countDecisions(content: unknown): number {
  const contentMap = content as Record<string, Record<string, unknown[]>> | undefined
  if (!contentMap) return 0
  return LIFECYCLE_STAGES.reduce((sum, stage) => {
    const stageData = contentMap[stage]
    const decisions = stageData?.['decisions']
    return sum + (Array.isArray(decisions) ? decisions.length : 0)
  }, 0)
}

function getStagesWithContent(content: unknown): string[] {
  const contentMap = content as Record<string, Record<string, unknown>> | undefined
  if (!contentMap) return []
  return LIFECYCLE_STAGES.filter((stage) => {
    const s = contentMap[stage]
    return s && Object.values(s).some((v) => typeof v === 'string' && v.trim().length > 0)
  })
}

function getTags(content: unknown): string[] {
  const contentMap = content as Record<string, unknown> | undefined
  const tags = contentMap?.['tags']
  return Array.isArray(tags) ? (tags as string[]) : []
}

function truncate(text: string, maxWords: number): string {
  const words = text.trim().split(/\s+/)
  if (words.length <= maxWords) return text.trim()
  return words.slice(0, maxWords).join(' ') + '…'
}

function getMissingStages(content: unknown): string[] {
  const contentMap = content as Record<string, Record<string, unknown>> | undefined
  if (!contentMap) return [...LIFECYCLE_STAGES]
  return LIFECYCLE_STAGES.filter((stage) => {
    const s = contentMap[stage]
    return !s || !Object.values(s).some((v) => typeof v === 'string' && v.trim().length > 0)
  })
}

function getKnownLimitationsCount(content: unknown): number {
  const contentMap = content as Record<string, unknown> | undefined
  if (!contentMap) return 0
  // Check top-level knownLimitations
  const topLevel = contentMap['knownLimitations']
  if (Array.isArray(topLevel)) return topLevel.length
  if (typeof topLevel === 'string' && topLevel.trim().length > 0) return 1
  // Check within stages
  let count = 0
  for (const stage of LIFECYCLE_STAGES) {
    const stageData = contentMap[stage] as Record<string, unknown> | undefined
    if (!stageData) continue
    const lim = stageData['knownLimitations']
    if (Array.isArray(lim)) count += lim.length
    else if (typeof lim === 'string' && lim.trim().length > 0) count += 1
  }
  return count
}

function getAnnotationWarningsCount(content: unknown): number {
  const contentMap = content as Record<string, unknown> | undefined
  if (!contentMap) return 0
  let count = 0
  // Check top-level annotations
  const topAnnotations = contentMap['annotations']
  if (Array.isArray(topAnnotations)) {
    count += topAnnotations.filter(
      (a: unknown) =>
        a &&
        typeof a === 'object' &&
        ('type' in a) &&
        ((a as Record<string, unknown>)['type'] === 'warning' ||
          (a as Record<string, unknown>)['type'] === 'breaking-change'),
    ).length
  }
  // Check within stages
  for (const stage of LIFECYCLE_STAGES) {
    const stageData = contentMap[stage] as Record<string, unknown> | undefined
    if (!stageData) continue
    const annotations = stageData['annotations']
    if (Array.isArray(annotations)) {
      count += annotations.filter(
        (a: unknown) =>
          a &&
          typeof a === 'object' &&
          ('type' in a) &&
          ((a as Record<string, unknown>)['type'] === 'warning' ||
            (a as Record<string, unknown>)['type'] === 'breaking-change'),
      ).length
    }
  }
  return count
}

// ----------------------------------------------------------------
// Shared badges
// ----------------------------------------------------------------

function CompletenessBadge({ pct }: { pct: number }) {
  const color =
    pct >= 80
      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
      : pct >= 40
        ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
        : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'

  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${color}`}>
      {pct}%
    </span>
  )
}

function CompletenessCell({ pct, missingStages }: { pct: number; missingStages: string[] }) {
  const barColor = pct >= 80 ? 'bg-green-500' : pct >= 40 ? 'bg-yellow-400' : 'bg-red-400'
  const title = missingStages.length > 0 ? `Missing: ${missingStages.join(', ')}` : 'Complete'
  return (
    <div className="flex flex-col gap-1 min-w-[4rem]" title={title}>
      <CompletenessBadge pct={pct} />
      <div className="h-1 w-full rounded-full bg-muted">
        <div className={`h-1 rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function StatusBadge({ status, frozen }: { status: string; frozen: boolean }) {
  const label = frozen ? 'frozen' : status
  const color =
    label === 'frozen'
      ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
      : label === 'active'
        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
        : label === 'flagged'
          ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400'
          : 'bg-muted text-muted-foreground'

  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${color}`}>
      {label}
    </span>
  )
}

const STATUS_LABELS: Record<string, string> = {
  active: 'Available',
  draft: 'In progress',
  frozen: 'Stable / frozen',
  deprecated: 'Retired',
  flagged: 'Under review',
}

function UserStatusBadge({ status, frozen }: { status: string; frozen: boolean }) {
  const key = frozen ? 'frozen' : status
  const label = STATUS_LABELS[key] ?? key
  const color =
    key === 'frozen'
      ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
      : key === 'active'
        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
        : key === 'flagged'
          ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400'
          : 'bg-muted text-muted-foreground'

  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${color}`}>
      {label}
    </span>
  )
}

function TagPill({ tag }: { tag: string }) {
  return (
    <span className="inline-flex items-center rounded-md bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground">
      {tag}
    </span>
  )
}

// ----------------------------------------------------------------
// View switcher
// ----------------------------------------------------------------

function ViewSwitcher({ current, onChange }: { current: ViewKey; onChange: (v: ViewKey) => void }) {
  return (
    <div className="flex items-center gap-1 rounded-lg border border-border bg-muted/30 p-1">
      {VIEWS.map(({ key, label, description }) => (
        <button
          key={key}
          type="button"
          title={description}
          onClick={() => onChange(key)}
          className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
            current === key
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

// ----------------------------------------------------------------
// Per-view table renderers
// ----------------------------------------------------------------

type FeatureRow = {
  id: string
  featureKey: string
  status: string
  frozen: boolean
  parentId: string | null
  content: unknown
  updatedAt: Date
}

function SortIndicator({ field, sortField, sortDir }: { field: SortField; sortField: SortField; sortDir: SortDir }) {
  if (sortField !== field) return <span className="ml-1 text-muted-foreground/40">↕</span>
  return <span className="ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>
}

function DevView({
  rows,
  idByKey,
  sortField,
  sortDir,
  toggleSort,
}: {
  rows: FeatureRow[]
  idByKey: Map<string, string>
  sortField: SortField
  sortDir: SortDir
  toggleSort: (field: SortField) => void
}) {
  void idByKey
  const thClass = 'px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground cursor-pointer select-none hover:text-foreground'
  const thStaticClass = 'px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground'
  return (
    <>
      <thead className="border-b border-border bg-muted/40">
        <tr>
          <th className={thStaticClass}>Key</th>
          <th className={thStaticClass}>Title / Problem</th>
          <th className={thClass} onClick={() => toggleSort('status')}>
            Status<SortIndicator field="status" sortField={sortField} sortDir={sortDir} />
          </th>
          <th className={thClass} onClick={() => toggleSort('completeness')}>
            Complete<SortIndicator field="completeness" sortField={sortField} sortDir={sortDir} />
          </th>
          <th className={thStaticClass}>Stages</th>
          <th className={thClass} onClick={() => toggleSort('decisions')}>
            Decisions<SortIndicator field="decisions" sortField={sortField} sortDir={sortDir} />
          </th>
          <th className={thClass} onClick={() => toggleSort('updatedAt')}>
            Updated<SortIndicator field="updatedAt" sortField={sortField} sortDir={sortDir} />
          </th>
        </tr>
      </thead>
      <tbody className="divide-y divide-border">
        {rows.map((f) => {
          const contentMap = f.content as Record<string, Record<string, unknown>> | undefined
          const problem = (contentMap?.['problem']?.['problemStatement'] as string | undefined) ?? ''
          const pct = computeCompleteness(f.content)
          const stages = getStagesWithContent(f.content)
          const decisions = countDecisions(f.content)
          const missingStages = getMissingStages(f.content)
          return (
            <tr key={f.id} className="transition-colors hover:bg-muted/40">
              <td className="px-4 py-3">
                <Link href={`/features/${f.id}`} className="font-mono text-xs text-primary hover:underline">
                  {f.featureKey}
                </Link>
              </td>
              <td className="max-w-xs px-4 py-3">
                <Link href={`/features/${f.id}`} className="line-clamp-1 text-sm text-foreground hover:text-primary">
                  {truncate(problem, 10) || '—'}
                </Link>
              </td>
              <td className="px-4 py-3">
                <StatusBadge status={f.status} frozen={f.frozen} />
              </td>
              <td className="px-4 py-3">
                <CompletenessCell pct={pct} missingStages={missingStages} />
              </td>
              <td className="px-4 py-3 text-xs text-muted-foreground">
                {stages.length}/{LIFECYCLE_STAGES.length}
              </td>
              <td className="px-4 py-3 text-xs text-muted-foreground">
                {decisions > 0 ? decisions : <span className="text-muted-foreground/50">—</span>}
              </td>
              <td className="px-4 py-3 text-xs text-muted-foreground">
                {f.updatedAt.toLocaleDateString()}
              </td>
            </tr>
          )
        })}
      </tbody>
    </>
  )
}

function PmView({
  rows,
  idByKey,
  allFeatures,
}: {
  rows: FeatureRow[]
  idByKey: Map<string, string>
  allFeatures: FeatureRow[]
}) {
  return (
    <>
      <thead className="border-b border-border bg-muted/40">
        <tr>
          <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Key</th>
          <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Title / Problem</th>
          <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Status</th>
          <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Complete</th>
          <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Tags</th>
          <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Children</th>
          <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Lineage</th>
          <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Updated</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-border">
        {rows.map((f) => {
          const contentMap = f.content as Record<string, Record<string, unknown>> | undefined
          const problem = (contentMap?.['problem']?.['problemStatement'] as string | undefined) ?? ''
          const tags = getTags(f.content)
          const pct = computeCompleteness(f.content)
          const childCount = allFeatures.filter((r) => r.parentId === f.id).length
          const parentKey = f.parentId
            ? (rows.find((r) => r.id === f.parentId)?.featureKey ?? idByKey.get(f.parentId) ?? f.parentId)
            : null
          return (
            <tr key={f.id} className="transition-colors hover:bg-muted/40">
              <td className="px-4 py-3">
                <Link href={`/features/${f.id}`} className="font-mono text-xs text-primary hover:underline">
                  {f.featureKey}
                </Link>
              </td>
              <td className="max-w-xs px-4 py-3">
                <Link href={`/features/${f.id}`} className="line-clamp-1 text-sm text-foreground hover:text-primary">
                  {truncate(problem, 8) || '—'}
                </Link>
              </td>
              <td className="px-4 py-3">
                <StatusBadge status={f.status} frozen={f.frozen} />
              </td>
              <td className="px-4 py-3">
                <CompletenessBadge pct={pct} />
              </td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap gap-1">
                  {tags.length > 0
                    ? tags.slice(0, 4).map((t) => <TagPill key={t} tag={t} />)
                    : <span className="text-xs text-muted-foreground/50">—</span>}
                </div>
              </td>
              <td className="px-4 py-3 text-xs text-muted-foreground">
                {childCount > 0 ? `${childCount} children` : <span className="text-muted-foreground/50">—</span>}
              </td>
              <td className="px-4 py-3 text-xs text-muted-foreground">
                {parentKey ? (
                  <span title="Spawned from">↳ {parentKey}</span>
                ) : (
                  <span className="text-muted-foreground/50">root</span>
                )}
              </td>
              <td className="px-4 py-3 text-xs text-muted-foreground">
                {f.updatedAt.toLocaleDateString()}
              </td>
            </tr>
          )
        })}
      </tbody>
    </>
  )
}

function SupportView({ rows }: { rows: FeatureRow[] }) {
  return (
    <>
      <thead className="border-b border-border bg-muted/40">
        <tr>
          <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Key</th>
          <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Problem statement</th>
          <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Status</th>
          <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Has analysis</th>
          <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Has support info</th>
          <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Limitations</th>
          <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Warnings</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-border">
        {rows.map((f) => {
          const contentMap = f.content as Record<string, Record<string, unknown>> | undefined
          const problem = (contentMap?.['problem']?.['problemStatement'] as string | undefined) ?? ''
          const analysisStage = contentMap?.['analysis']
          const supportStage = contentMap?.['support']
          const hasAnalysis = analysisStage
            ? Object.values(analysisStage).some((v) => typeof v === 'string' && v.trim().length > 0)
            : false
          const hasSupport = supportStage
            ? Object.values(supportStage).some((v) => typeof v === 'string' && v.trim().length > 0)
            : false
          const limitationsCount = getKnownLimitationsCount(f.content)
          const warningsCount = getAnnotationWarningsCount(f.content)
          return (
            <tr key={f.id} className="transition-colors hover:bg-muted/40">
              <td className="px-4 py-3">
                <Link href={`/features/${f.id}`} className="font-mono text-xs text-primary hover:underline">
                  {f.featureKey}
                </Link>
              </td>
              <td className="px-4 py-3" style={{ maxWidth: '32rem' }}>
                <Link href={`/features/${f.id}`} className="text-sm text-foreground hover:text-primary">
                  <span className="line-clamp-2">
                    {problem || <span className="italic text-muted-foreground">No problem statement</span>}
                  </span>
                </Link>
              </td>
              <td className="px-4 py-3">
                <StatusBadge status={f.status} frozen={f.frozen} />
              </td>
              <td className="px-4 py-3 text-xs">
                {hasAnalysis
                  ? <span className="text-green-600 dark:text-green-400">✓</span>
                  : <span className="text-muted-foreground/50">—</span>}
              </td>
              <td className="px-4 py-3 text-xs">
                {hasSupport
                  ? <span className="text-green-600 dark:text-green-400">✓</span>
                  : <span className="text-muted-foreground/50">—</span>}
              </td>
              <td className="px-4 py-3 text-xs text-muted-foreground">
                {limitationsCount > 0
                  ? `${limitationsCount} limitation${limitationsCount !== 1 ? 's' : ''}`
                  : <span className="text-muted-foreground/50">—</span>}
              </td>
              <td className="px-4 py-3 text-xs">
                {warningsCount > 0 ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2 py-0.5 font-medium text-orange-800 dark:bg-orange-900/30 dark:text-orange-400">
                    ⚠ {warningsCount} warning{warningsCount !== 1 ? 's' : ''}
                  </span>
                ) : (
                  <span className="text-muted-foreground/50">—</span>
                )}
              </td>
            </tr>
          )
        })}
      </tbody>
    </>
  )
}

function UserView({ rows }: { rows: FeatureRow[] }) {
  return (
    <>
      <thead className="border-b border-border bg-muted/40">
        <tr>
          <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Feature</th>
          <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">What it solves</th>
          <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Status</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-border">
        {rows.map((f) => {
          const contentMap = f.content as Record<string, Record<string, unknown>> | undefined
          const problem = (contentMap?.['problem']?.['problemStatement'] as string | undefined) ?? ''
          const reporterCtx = (contentMap?.['problem']?.['reporterContext'] as string | undefined) ?? ''
          const tags = getTags(f.content)
          const implStage = contentMap?.['implementation'] as Record<string, unknown> | undefined
          const implText = implStage
            ? (Object.values(implStage).find((v) => typeof v === 'string' && (v as string).trim().length > 0) as string | undefined)
            : undefined
          return (
            <tr key={f.id} className="transition-colors hover:bg-muted/40">
              <td className="px-4 py-3">
                <Link href={`/features/${f.id}`} className="font-mono text-xs text-primary hover:underline">
                  {f.featureKey}
                </Link>
              </td>
              <td className="px-4 py-3" style={{ maxWidth: '40rem' }}>
                <Link href={`/features/${f.id}`} className="block text-sm text-foreground hover:text-primary">
                  <p className="line-clamp-2">{problem || <em className="text-muted-foreground">Not described yet</em>}</p>
                  {reporterCtx && (
                    <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{reporterCtx}</p>
                  )}
                  {tags.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {tags.slice(0, 3).map((t) => <TagPill key={t} tag={t} />)}
                    </div>
                  )}
                  {implText && (
                    <p className="mt-0.5 text-xs text-muted-foreground/70 line-clamp-1">→ {implText.slice(0, 80)}</p>
                  )}
                </Link>
              </td>
              <td className="px-4 py-3">
                <UserStatusBadge status={f.status} frozen={f.frozen} />
              </td>
            </tr>
          )
        })}
      </tbody>
    </>
  )
}

// ----------------------------------------------------------------
// Status summary
// ----------------------------------------------------------------

function StatusSummary({ features }: { features: Array<{ status: string }> }) {
  const counts = features.reduce<Record<string, number>>((acc, f) => {
    acc[f.status] = (acc[f.status] ?? 0) + 1
    return acc
  }, {})
  const parts = (['active', 'draft', 'frozen', 'deprecated'] as const)
    .filter(s => (counts[s] ?? 0) > 0)
    .map(s => `${counts[s]} ${s}`)
  if (parts.length === 0) return null
  return (
    <p className="text-sm text-muted-foreground mb-3">
      {parts.join('  ·  ')}
    </p>
  )
}

// ----------------------------------------------------------------
// Global stats card
// ----------------------------------------------------------------

function StatCard({ value, label, colorClass }: { value: string | number; label: string; colorClass?: string }) {
  return (
    <div className="flex flex-col items-center rounded-lg border border-border bg-muted/20 px-4 py-2 min-w-[6rem]">
      <span className={`text-lg font-bold tabular-nums ${colorClass ?? 'text-foreground'}`}>{value}</span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  )
}

function GlobalStats({ features }: { features: FeatureRow[] }) {
  if (features.length === 0) return null
  const pcts = features.map((f) => computeCompleteness(f.content))
  const avgPct = Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length)
  const needsAttention = pcts.filter((p) => p < 40).length
  const noDecisions = features.filter((f) => countDecisions(f.content) === 0).length

  const avgColor =
    avgPct >= 80
      ? 'text-green-600 dark:text-green-400'
      : avgPct >= 40
        ? 'text-yellow-600 dark:text-yellow-400'
        : 'text-red-600 dark:text-red-400'

  return (
    <div className="flex flex-wrap gap-3">
      <StatCard value={`${avgPct}%`} label="avg completeness" colorClass={avgColor} />
      <StatCard
        value={needsAttention}
        label="need attention"
        colorClass={needsAttention > 0 ? 'text-red-600 dark:text-red-400' : undefined}
      />
      <StatCard value={noDecisions} label="no decisions yet" />
    </div>
  )
}

// ----------------------------------------------------------------
// Main component
// ----------------------------------------------------------------

const PAGE_SIZE = 20

export function CompletenessTable() {
  const trpc = useTRPC()
  const searchParams = useSearchParams()
  const router = useRouter()

  const rawView = searchParams.get('view') ?? 'dev'
  const currentView: ViewKey =
    rawView === 'pm' || rawView === 'support' || rawView === 'user' || rawView === 'dev'
      ? rawView
      : 'dev'

  const rawPage = searchParams.get('page')
  const currentPage = rawPage ? Math.max(1, parseInt(rawPage, 10) || 1) : 1

  // Filter state
  const [filterText, setFilterText] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterCompleteness, setFilterCompleteness] = useState('')

  const debouncedFilterText = useDebounce(filterText, 300)

  const { data, isLoading, isFetching } = useQuery(
    trpc.features.listFeaturesPaginated.queryOptions({
      cursor: (currentPage - 1) * PAGE_SIZE,
      limit: PAGE_SIZE,
      status: (filterStatus || undefined) as 'active' | 'draft' | 'frozen' | 'flagged' | 'all' | undefined,
      search: debouncedFilterText.trim() || undefined,
      completenessLevel: (filterCompleteness as 'needs' | 'partial' | 'complete') || undefined,
    }),
  )

  // Sort state (Dev view only)
  const [sortField, setSortField] = useState<SortField>(null)
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortDir('asc')
    }
  }

  function switchView(v: ViewKey) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('view', v)
    params.set('page', '1')
    router.push(`?${params.toString()}`)
  }

  function goToPage(pageNum: number) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', String(pageNum))
    router.push(`?${params.toString()}`)
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="h-10 animate-pulse rounded bg-muted" />
        ))}
      </div>
    )
  }

  const features = (data?.features ?? []) as FeatureRow[]

  // Completeness filter is now server-side (via completenessLevel param) — no client-side filtering needed
  const filteredFeatures = features

  // ---- Sorting (applied before pagination) ----
  let sortedFeatures = [...filteredFeatures]
  if (sortField) {
    sortedFeatures.sort((a, b) => {
      let aVal: number | string
      let bVal: number | string
      if (sortField === 'completeness') {
        aVal = computeCompleteness(a.content)
        bVal = computeCompleteness(b.content)
      } else if (sortField === 'decisions') {
        aVal = countDecisions(a.content)
        bVal = countDecisions(b.content)
      } else if (sortField === 'updatedAt') {
        aVal = a.updatedAt.getTime()
        bVal = b.updatedAt.getTime()
      } else {
        // status
        aVal = a.frozen ? 'frozen' : a.status
        bVal = b.frozen ? 'frozen' : b.status
      }
      if (aVal < bVal) return sortDir === 'asc' ? -1 : 1
      if (aVal > bVal) return sortDir === 'asc' ? 1 : -1
      return 0
    })
  }

  // Pagination is server-side: server returns PAGE_SIZE items for the current cursor
  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / PAGE_SIZE))
  const slice = sortedFeatures

  // Build id→featureKey map for lineage lookups
  const idByKey = new Map(features.map((f) => [f.id, f.featureKey]))

  const viewDescription = VIEWS.find((v) => v.key === currentView)?.description ?? ''

  const selectClass =
    'rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring'
  const inputClass =
    'rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring'

  return (
    <div className={`flex flex-col gap-4 transition-opacity duration-200 ${isFetching ? 'opacity-60 pointer-events-none' : ''}`}>
      {/* Fetching indicator */}
      {isFetching && (
        <div className="h-0.5 w-full animate-pulse rounded bg-primary/50" />
      )}

      {/* Status summary */}
      <StatusSummary features={features} />

      {/* Filter bar */}
      <div className="flex flex-wrap gap-2">
        <input
          type="text"
          placeholder="Search features..."
          aria-label="Search features by key, problem statement, or tag"
          value={filterText}
          onChange={(e) => { setFilterText(e.target.value); goToPage(1) }}
          className={inputClass}
        />
        <select
          value={filterStatus}
          aria-label="Filter by feature status"
          onChange={(e) => { setFilterStatus(e.target.value); goToPage(1) }}
          className={selectClass}
        >
          <option value="">All statuses</option>
          <option value="active">active</option>
          <option value="draft">draft</option>
          <option value="frozen">frozen</option>
          <option value="deprecated">deprecated</option>
        </select>
        <select
          value={filterCompleteness}
          aria-label="Filter by completeness level"
          onChange={(e) => { setFilterCompleteness(e.target.value); goToPage(1) }}
          className={selectClass}
        >
          <option value="">Any completeness</option>
          <option value="needs">Needs attention (&lt;40%)</option>
          <option value="partial">Partial (40–79%)</option>
          <option value="complete">Complete (≥80%)</option>
        </select>
      </div>

      {/* Global stats + histogram */}
      <div className="flex flex-wrap items-end gap-6">
        <GlobalStats features={filteredFeatures} />
        <CompletenessHistogram values={filteredFeatures.map((f) => computeCompleteness(f.content))} />
      </div>

      {/* Header row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <p className="text-sm text-muted-foreground">
            {filteredFeatures.length === features.length
              ? `${features.length} feature${features.length !== 1 ? 's' : ''}`
              : `${filteredFeatures.length} of ${features.length} feature${features.length !== 1 ? 's' : ''}`}
          </p>
          <p className="text-xs text-muted-foreground/70">{viewDescription}</p>
        </div>
        <ViewSwitcher current={currentView} onChange={switchView} />
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          {slice.length === 0 ? (
            <>
              <thead className="border-b border-border bg-muted/40">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Feature Key</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="px-4 py-8 text-center text-muted-foreground">
                    {filteredFeatures.length === 0 && features.length > 0
                      ? 'No features match the current filters.'
                      : 'No features yet.'}
                  </td>
                </tr>
              </tbody>
            </>
          ) : currentView === 'dev' ? (
            <DevView
              rows={slice}
              idByKey={idByKey}
              sortField={sortField}
              sortDir={sortDir}
              toggleSort={toggleSort}
            />
          ) : currentView === 'pm' ? (
            <PmView rows={slice} idByKey={idByKey} allFeatures={features} />
          ) : currentView === 'support' ? (
            <SupportView rows={slice} />
          ) : (
            <UserView rows={slice} />
          )}
        </table>
      </div>

      {/* Pagination controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 text-sm">
          <button
            type="button"
            disabled={currentPage <= 1}
            onClick={() => goToPage(currentPage - 1)}
            className="rounded px-3 py-1.5 text-muted-foreground hover:bg-muted disabled:opacity-40"
          >
            ← Previous
          </button>
          <span className="text-muted-foreground">
            Page {currentPage} of {totalPages}
          </span>
          <button
            type="button"
            disabled={currentPage >= totalPages}
            onClick={() => goToPage(currentPage + 1)}
            className="rounded px-3 py-1.5 text-muted-foreground hover:bg-muted disabled:opacity-40"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  )
}

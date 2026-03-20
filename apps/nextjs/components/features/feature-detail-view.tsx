"use client"

import { useEffect, useMemo, useRef, useState } from 'react'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'

import { Button } from '@life-as-code/ui'
import { LIFECYCLE_STAGES } from '@life-as-code/validators'
import type { DecisionEntry } from '@life-as-code/validators'

import { useTRPC } from '@/trpc/react'
import { STAGE_LABEL } from '@/lib/stage-labels'
import { getContentMap, getTitle, getTags, countFilledStages } from '@/lib/feature-content'
import { TabStrip } from '@/components/ui/tab-strip'
import type { TabDef } from '@/components/ui/tab-strip'
import { DecisionLogEntry } from '@/components/wizard/decision-log-entry'
import { WizardShell } from '@/components/wizard/wizard-shell'
import { formatRelativeTime } from '@/lib/format-relative-time'
import { useToastStore } from '@/stores/toast-store'

import { AnnotationList } from './annotation-list'
import { AuditHistory } from './audit-history'
import { GuideView } from './guide-view'
import { FeatureStateBadge } from './feature-state-badge'
import { LineageSection } from './lineage-section'
import { ProvenanceChain } from './provenance-chain'
import { ScoreBadge } from './score-badge'
import { SpawnDialog } from './spawn-dialog'
import { StageCompletionIndicator } from './stage-completion-indicator'

const TABS = ['overview', 'edit', 'guide', 'lineage', 'decisions', 'annotations', 'history'] as const
type Tab = typeof TABS[number]

interface FeatureDetailViewProps {
  featureId: string
}

export function FeatureDetailView({ featureId }: FeatureDetailViewProps) {
  const trpc = useTRPC()
  const { data: feature } = useQuery(trpc.features.getFeature.queryOptions({ id: featureId }))
  const { data: parentFeature } = useQuery({
    ...trpc.features.getFeature.queryOptions({ id: feature?.parentId ?? '' }),
    enabled: !!feature?.parentId,
  })

  const queryClient = useQueryClient()
  const showToast = useToastStore((s) => s.showToast)

  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const [showSpawnDialog, setShowSpawnDialog] = useState(false)
  const [keyCopied, setKeyCopied] = useState(false)
  const [targetPeriodDraft, setTargetPeriodDraft] = useState<string>('')
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])

  const setScoreMutation = useMutation({
    ...trpc.features.setScore.mutationOptions(),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: trpc.features.getFeature.queryOptions({ id: featureId }).queryKey,
      })
      showToast({ type: 'success', message: 'Score updated' })
    },
    onError: () => {
      showToast({ type: 'error', message: 'Failed to update score' })
    },
  })

  const setTargetPeriodMutation = useMutation({
    ...trpc.features.setTargetPeriod.mutationOptions(),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: trpc.features.getFeature.queryOptions({ id: featureId }).queryKey,
      })
      showToast({ type: 'success', message: 'Target period updated' })
    },
    onError: () => {
      showToast({ type: 'error', message: 'Failed to update target period' })
    },
  })

  // Open the correct tab from URL hash or ?edit=1 param on mount
  useEffect(() => {
    const hash = window.location.hash.slice(1)
    if ((TABS as readonly string[]).includes(hash)) {
      setActiveTab(hash as Tab)
      return
    }
    const params = new URLSearchParams(window.location.search)
    if (params.get('edit') === '1') {
      setActiveTab('edit')
    }
  }, [])

  // Sync targetPeriodDraft when feature loads or changes
  useEffect(() => {
    setTargetPeriodDraft(feature?.targetPeriod ?? '')
  }, [feature?.targetPeriod])

  const switchTab = (tab: Tab) => {
    setActiveTab(tab)
    const newHash = tab === 'overview' ? '' : `#${tab}`
    history.replaceState(null, '', newHash.length > 0 ? newHash : window.location.pathname)
  }

  const handleTabKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, currentIndex: number) => {
    let next: number | null = null
    if (e.key === 'ArrowRight') next = (currentIndex + 1) % TABS.length
    else if (e.key === 'ArrowLeft') next = (currentIndex - 1 + TABS.length) % TABS.length
    if (next !== null) {
      e.preventDefault()
      const nextTab = TABS[next]
      if (nextTab) {
        switchTab(nextTab)
        tabRefs.current[next]?.focus()
      }
    }
  }

  // Memoise derived data — must be before early return to satisfy rules of hooks
  const contentMap = useMemo(() => getContentMap(feature?.content), [feature?.content])
  const title = useMemo(() => (feature ? getTitle(feature.content) : ''), [feature])
  const owner = useMemo(
    () => (contentMap as Record<string, unknown> | undefined)?.['owner'] as string | undefined,
    [contentMap],
  )
  const tags = useMemo(() => (feature ? getTags(feature.content) : []), [feature])
  const completedStages = useMemo(() => (feature ? countFilledStages(feature.content) : 0), [feature])
  const allDecisions = useMemo(
    () =>
      LIFECYCLE_STAGES.flatMap((stage) => {
        const stageData = contentMap?.[stage] as Record<string, unknown> | undefined
        const decisions = (stageData?.decisions as DecisionEntry[]) ?? []
        return decisions.map((d) => ({ decision: d, stage }))
      }),
    [contentMap],
  )

  // Loading skeleton
  if (!feature) {
    return (
      <div className="animate-pulse p-6 flex flex-col gap-4">
        <div className="h-4 w-48 rounded bg-muted" />
        <div className="h-8 w-96 rounded bg-muted" />
        <div className="h-4 w-32 rounded bg-muted" />
      </div>
    )
  }

  // Build tab definitions with the dynamic Edit label showing completion progress
  const tabDefs: TabDef<Tab>[] = [
    { key: 'overview',    label: 'Overview' },
    { key: 'edit',        label: `Edit (${completedStages}/${LIFECYCLE_STAGES.length})` },
    { key: 'guide',       label: 'Guide' },
    { key: 'lineage',     label: 'Lineage' },
    { key: 'decisions',   label: 'Decisions' },
    { key: 'annotations', label: 'Annotations' },
    { key: 'history',     label: 'History' },
  ]

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-xs text-muted-foreground">
        <Link href="/features" className="hover:text-foreground transition-colors">
          Features
        </Link>
        {parentFeature && (
          <>
            <span aria-hidden="true">›</span>
            <Link
              href={`/features/${parentFeature.id}`}
              className="font-mono hover:text-foreground transition-colors"
            >
              {parentFeature.featureKey}
            </Link>
          </>
        )}
        <span aria-hidden="true">›</span>
        <span className="font-mono text-foreground">{feature.featureKey}</span>
      </nav>

      {/* Header */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm text-muted-foreground">{feature.featureKey}</span>
          <button
            type="button"
            aria-label={keyCopied ? 'Copied!' : `Copy feature key ${feature.featureKey}`}
            title={keyCopied ? 'Copied!' : 'Copy feature key'}
            onClick={() => {
              void navigator.clipboard.writeText(feature.featureKey).then(() => {
                if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current)
                setKeyCopied(true)
                copyTimeoutRef.current = setTimeout(() => { setKeyCopied(false) }, 1500)
              })
            }}
            className="rounded p-0.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {keyCopied ? (
              <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            ) : (
              <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
            )}
          </button>
          {keyCopied && (
            <span className="text-xs text-primary animate-in fade-in slide-in-from-left-1">
              Copied!
            </span>
          )}
        </div>
        <h1 className="text-2xl font-bold leading-snug text-foreground">{title}</h1>
        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          {owner && (
            <span>
              Owner: <span className="font-medium text-foreground">{owner}</span>
            </span>
          )}
          {feature.updatedAt && (
            <span title={new Date(feature.updatedAt).toISOString()}>
              Updated{' '}
              <span className="text-foreground">
                {formatRelativeTime(new Date(feature.updatedAt))}
              </span>
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <FeatureStateBadge status={feature.status} frozen={feature.frozen} />
          <StageCompletionIndicator
            completedStages={completedStages}
            totalStages={LIFECYCLE_STAGES.length}
          />
          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                const exportContentMap = (feature.content ?? {}) as Record<string, unknown>
                const problem = exportContentMap['problem'] as Record<string, unknown> | undefined
                const problemStatement = (problem?.['problemStatement'] as string | undefined) ?? ''
                const titleWords = problemStatement.trim().split(/\s+/)
                const derivedTitle =
                  titleWords.length <= 6
                    ? problemStatement.trim()
                    : titleWords.slice(0, 6).join(' ') + '...'

                const featureJson: Record<string, unknown> = {
                  featureKey: feature.featureKey,
                  title: derivedTitle || feature.featureKey,
                  status: feature.status === 'flagged' ? 'draft' : feature.status,
                  problem: problemStatement,
                }

                const analysis = exportContentMap['analysis'] as Record<string, unknown> | undefined
                if (analysis && Object.keys(analysis).length > 0) {
                  const analysisText = Object.values(analysis)
                    .filter((v) => typeof v === 'string')
                    .join('\n\n')
                  if (analysisText) featureJson['analysis'] = analysisText
                }

                const impl = exportContentMap['implementation'] as Record<string, unknown> | undefined
                if (impl && Object.keys(impl).length > 0) {
                  const implText = Object.values(impl)
                    .filter((v) => typeof v === 'string')
                    .join('\n\n')
                  if (implText) featureJson['implementation'] = implText
                }

                const exportTags = exportContentMap['tags'] as string[] | undefined
                if (exportTags && exportTags.length > 0) featureJson['tags'] = exportTags

                if (parentFeature?.featureKey) {
                  featureJson['lineage'] = { parent: parentFeature.featureKey }
                }

                const blob = new Blob([JSON.stringify(featureJson, null, 2)], {
                  type: 'application/json',
                })
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = `${feature.featureKey}.json`
                a.click()
                URL.revokeObjectURL(url)
              }}
              className="text-sm text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
            >
              Export JSON
            </button>
            {feature.frozen && (
              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={() => { setShowSpawnDialog(true) }}
              >
                Evolve this feature
              </Button>
            )}
          </div>
        </div>
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {tags.map((tag) => (
              <span key={tag} className="rounded-full bg-muted px-2 py-0.5 text-xs">
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Tab strip — shared TabStrip component */}
      <TabStrip
        tabs={tabDefs}
        active={activeTab}
        onSwitch={switchTab}
        tabRefs={tabRefs}
        onKeyDown={handleTabKeyDown}
        ariaLabel="Feature detail tabs"
      />

      {/* Tab panel */}
      <div
        role="tabpanel"
        id={`tabpanel-${activeTab}`}
        aria-labelledby={`tab-${activeTab}`}
      >
        {activeTab === 'overview' && (
          <div className="flex flex-col gap-6">
            <ProvenanceChain feature={feature} />

            {/* Priority Score + Target Period */}
            <div className="flex flex-col gap-3 rounded-lg border border-border p-4">
              {/* Priority Score row */}
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm text-muted-foreground">Priority Score</span>
                <div className="flex items-center gap-2">
                  <ScoreBadge score={feature.score ?? null} />
                  {!feature.frozen && (
                    <select
                      value={feature.score ?? ''}
                      onChange={(e) => {
                        const val = e.target.value === '' ? null : Number(e.target.value)
                        void setScoreMutation.mutate({ featureId, score: val })
                      }}
                      className="rounded-md border border-border bg-background px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                      aria-label="Set priority score"
                    >
                      <option value="">– (clear)</option>
                      {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                        <option key={n} value={n}>{n}</option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              {/* Target Period row */}
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm text-muted-foreground">Target Period</span>
                <div className="flex items-center gap-2">
                  {feature.frozen ? (
                    <span className="text-xs text-muted-foreground">
                      {feature.targetPeriod ?? 'Unscheduled'}
                    </span>
                  ) : (
                    <input
                      type="text"
                      value={targetPeriodDraft}
                      onChange={(e) => { setTargetPeriodDraft(e.target.value) }}
                      onBlur={() => {
                        const trimmed = targetPeriodDraft.trim()
                        const newVal = trimmed.length > 0 ? trimmed : null
                        if (newVal !== (feature.targetPeriod ?? null)) {
                          void setTargetPeriodMutation.mutate({ featureId, targetPeriod: newVal })
                        }
                      }}
                      placeholder="e.g. 2026-Q3"
                      className="rounded-md border border-border bg-background px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                      aria-label="Set target period"
                    />
                  )}
                </div>
              </div>
            </div>

            {(contentMap?.problem?.problemStatement as string | undefined) &&
              !contentMap?.analysis &&
              !feature.frozen && (
                <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
                  <p className="mb-2">No analysis yet — describe how this feature works.</p>
                  <button
                    type="button"
                    onClick={() => switchTab('edit')}
                    className="text-primary underline-offset-2 hover:underline"
                  >
                    Open Edit tab to add analysis →
                  </button>
                </div>
              )}
          </div>
        )}

        {activeTab === 'edit' && (
          <div className="-mx-6 -mb-6 border-t border-border">
            {/* WizardShell in inline mode: no progress bar, no prev/next footer */}
            <WizardShell featureId={featureId} inline />
          </div>
        )}

        {activeTab === 'guide' && (
          <GuideView featureId={featureId} />
        )}

        {activeTab === 'lineage' && (
          <div className="flex flex-col gap-4">
            <LineageSection featureId={featureId} />
          </div>
        )}

        {activeTab === 'decisions' && (
          <div className="flex flex-col gap-6">
            {allDecisions.length === 0 && (
              <div className="rounded-lg border border-dashed border-border p-6 text-center">
                <p className="text-sm text-muted-foreground">
                  No decisions recorded yet.
                </p>
                {!feature.frozen && (
                  <button
                    type="button"
                    onClick={() => switchTab('edit')}
                    className="mt-2 inline-block text-sm text-primary underline-offset-2 hover:underline"
                  >
                    Open Edit tab to record a decision →
                  </button>
                )}
              </div>
            )}
            {allDecisions.length > 0 && LIFECYCLE_STAGES.map((stage) => {
              const stageDecisions = allDecisions.filter((d) => d.stage === stage)
              if (stageDecisions.length === 0) return null
              return (
                <section key={stage}>
                  <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    {STAGE_LABEL[stage] ?? stage}
                  </h3>
                  <div className="flex flex-col gap-3">
                    {stageDecisions.map(({ decision }) => (
                      <DecisionLogEntry key={decision.id} entry={decision} />
                    ))}
                  </div>
                </section>
              )
            })}
          </div>
        )}

        {activeTab === 'annotations' && (
          <div className="flex flex-col gap-4">
            <p className="text-xs text-muted-foreground">
              No annotations. Tag this feature with <code className="font-mono">lac tag</code>.
            </p>
            <AnnotationList featureId={featureId} />
          </div>
        )}

        {activeTab === 'history' && (
          <AuditHistory featureId={featureId} />
        )}
      </div>

      {showSpawnDialog && (
        <SpawnDialog
          parentId={featureId}
          parentFeatureKey={feature.featureKey}
          parentTitle={title}
          onClose={() => { setShowSpawnDialog(false) }}
        />
      )}
    </div>
  )
}

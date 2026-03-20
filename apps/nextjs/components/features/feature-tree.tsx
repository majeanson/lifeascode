"use client"

import { type ElementType, memo, useCallback, useEffect, useRef, useState } from 'react'

import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { Tree } from 'react-arborist'
import type { NodeRendererProps } from 'react-arborist'

import type { RouterOutputs } from '@life-as-code/api'
import { LIFECYCLE_STAGES } from '@life-as-code/validators'
import type { LifecycleStage } from '@life-as-code/validators'

import { STAGE_LABEL } from '@/lib/stage-labels'
import { useTRPC, useTRPCClient } from '@/trpc/react'
import { formatRelativeTime } from '@/lib/format-relative-time'

import { FeatureStateBadge } from './feature-state-badge'
import { StageCompletionIndicator } from './stage-completion-indicator'

// ── Types ─────────────────────────────────────────────────────────────────────

type SlimFeature = RouterOutputs['features']['listRootFeatures'][number]

export interface LazyTreeNode extends SlimFeature {
  /** Loaded children — null means leaf, undefined means not fetched yet, [] means fetching */
  children: LazyTreeNode[] | null | undefined
}

// ── Tree node renderer ─────────────────────────────────────────────────────────

function LazyFeatureTreeNode({ node, style }: NodeRendererProps<LazyTreeNode>) {
  const title = node.data.title || node.data.problem || node.data.featureKey
  const pct = node.data.completeness_pct
  const completedStages = Math.round((pct / 100) * LIFECYCLE_STAGES.length)

  // hasChildren=true but children not yet loaded → show toggle
  const isExpandable = node.data.hasChildren
  const isLoading = node.data.hasChildren && node.data.children !== null && node.data.children !== undefined && node.data.children.length === 0 && node.isOpen

  return (
    <div
      style={{ ...style, paddingLeft: `${node.level * 20 + 8}px` }}
      className={`flex items-center gap-2 border-b border-border/30 pr-3 transition-colors ${
        node.isSelected ? 'bg-primary/10' : 'hover:bg-muted/60'
      }`}
    >
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); node.toggle() }}
        aria-label={node.isOpen ? 'Collapse' : 'Expand'}
        className={`shrink-0 flex h-4 w-4 items-center justify-center rounded text-xs text-muted-foreground transition-colors hover:text-foreground ${
          !isExpandable ? 'invisible' : ''
        }`}
      >
        {isLoading ? (
          <span className="animate-spin text-[10px]">⟳</span>
        ) : node.isOpen ? '▾' : '▸'}
      </button>

      <span className="shrink-0 font-mono text-[11px] text-muted-foreground leading-none">
        {node.data.featureKey}
      </span>

      <span className="min-w-0 flex-1 truncate text-sm leading-none">{title}</span>

      <FeatureStateBadge status={node.data.status} frozen={node.data.frozen} variant="compact" />
      <StageCompletionIndicator completedStages={completedStages} totalStages={LIFECYCLE_STAGES.length} />
    </div>
  )
}

// ── Detail panel — fetches full feature on selection ──────────────────────────

function StageGrid({ content }: { content: unknown }) {
  const contentMap = content as Record<string, Record<string, unknown>> | undefined
  return (
    <div className="grid grid-cols-3 gap-1.5">
      {LIFECYCLE_STAGES.map((stage) => {
        const s = contentMap?.[stage]
        const filled = s && Object.values(s).some((v) => typeof v === 'string' && v.trim().length > 0)
        return (
          <div
            key={stage}
            className={`flex items-center gap-1.5 rounded px-2 py-1 text-xs ${
              filled ? 'bg-primary/10 text-foreground' : 'bg-muted/50 text-muted-foreground'
            }`}
          >
            <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${filled ? 'bg-primary' : 'bg-border'}`} />
            {STAGE_LABEL[stage as LifecycleStage]}
          </div>
        )
      })}
    </div>
  )
}

const FeatureTreePanel = memo(function FeatureTreePanel({ nodeId }: { nodeId: string }) {
  const trpc = useTRPC()
  const { data: feature, isLoading } = useQuery(
    trpc.features.getFeature.queryOptions({ id: nodeId }),
  )

  if (isLoading || !feature) {
    return (
      <div className="flex flex-col gap-4 p-5 animate-pulse">
        <div className="h-4 w-24 rounded bg-muted" />
        <div className="h-7 w-64 rounded bg-muted" />
        <div className="grid grid-cols-3 gap-1.5">
          {LIFECYCLE_STAGES.map((s) => <div key={s} className="h-7 rounded bg-muted" />)}
        </div>
      </div>
    )
  }

  const contentMap = feature.content as Record<string, Record<string, unknown>> | undefined
  const title = (feature.content as Record<string, string> | undefined)?.title
    ?? (contentMap?.problem?.problemStatement as string | undefined)?.split(' ').slice(0, 8).join(' ')
    ?? 'Untitled'
  const tags = (feature.content as Record<string, unknown> | undefined)?.tags
  const tagList = Array.isArray(tags) ? (tags as string[]) : []

  return (
    <div className="flex flex-col gap-5 p-5">
      <div className="flex flex-col gap-2">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <span className="font-mono text-xs text-muted-foreground">{feature.featureKey}</span>
            <h2 className="mt-0.5 text-lg font-semibold leading-snug">{title}</h2>
          </div>
          <FeatureStateBadge status={feature.status} frozen={feature.frozen} />
        </div>
        <p className="text-xs text-muted-foreground">Updated {formatRelativeTime(feature.updatedAt)}</p>
        {tagList.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {tagList.map((tag) => (
              <span key={tag} className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">{tag}</span>
            ))}
          </div>
        )}
      </div>

      {(contentMap?.problem?.problemStatement as string | undefined) && (
        <div>
          <p className="mb-1 text-xs font-medium uppercase tracking-widest text-muted-foreground">Problem</p>
          <p className="text-sm text-foreground/80 leading-relaxed line-clamp-4">
            {contentMap?.problem?.problemStatement as string}
          </p>
        </div>
      )}

      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-widest text-muted-foreground">Stages</p>
        <StageGrid content={feature.content} />
      </div>

      <div className="flex items-center gap-2 border-t border-border pt-4">
        <Link
          href={`/features/${feature.id}`}
          className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          View detail
        </Link>
        {!feature.frozen && (
          <Link
            href={`/features/${feature.id}?edit=1`}
            className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
          >
            Edit
          </Link>
        )}
      </div>
    </div>
  )
})

function EmptyPanel() {
  return (
    <div className="flex h-full items-center justify-center p-8">
      <div className="text-center">
        <p className="text-sm font-medium text-foreground">Select a feature</p>
        <p className="mt-1 text-xs text-muted-foreground">Click any row in the tree to see its details here</p>
      </div>
    </div>
  )
}

// ── Build flat node map helper ─────────────────────────────────────────────────

function applyChildren(
  nodes: LazyTreeNode[],
  parentId: string,
  children: LazyTreeNode[],
): LazyTreeNode[] {
  return nodes.map((n) => {
    if (n.id === parentId) return { ...n, children }
    if (n.children && n.children.length > 0) {
      return { ...n, children: applyChildren(n.children, parentId, children) }
    }
    return n
  })
}

// ── Main tree component ────────────────────────────────────────────────────────

export function FeatureTree() {
  const trpc = useTRPC()
  const trpcClient = useTRPCClient()

  const { data: roots = [], isLoading } = useQuery(
    trpc.features.listRootFeatures.queryOptions(),
  )

  // Tree data: roots with lazily loaded children
  const [treeData, setTreeData] = useState<LazyTreeNode[]>([])

  useEffect(() => {
    // Initialise tree from roots — children set to null (leaf) or undefined (not fetched)
    setTreeData(
      roots.map((r) => ({
        ...r,
        parentId: null,
        children: r.hasChildren ? undefined : null,
      })),
    )
  }, [roots])

  const [filterTerm, setFilterTerm] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  // Measure tree container
  const treeContainerRef = useRef<HTMLDivElement>(null)
  const [treeWidth, setTreeWidth] = useState(300)
  const [treeHeight, setTreeHeight] = useState(600)

  useEffect(() => {
    const el = treeContainerRef.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => {
      if (!entry) return
      setTreeWidth(Math.floor(entry.contentRect.width))
      setTreeHeight(Math.floor(entry.contentRect.height))
    })
    ro.observe(el)
    return () => { ro.disconnect() }
  }, [])

  // On toggle: if node has children=undefined (not fetched), fetch now
  const handleToggle = useCallback(
    async (id: string) => {
      const findNode = (nodes: LazyTreeNode[]): LazyTreeNode | undefined => {
        for (const n of nodes) {
          if (n.id === id) return n
          if (n.children) {
            const found = findNode(n.children)
            if (found) return found
          }
        }
      }
      const node = findNode(treeData)
      if (!node || !node.hasChildren || node.children !== undefined) return

      // Mark as loading (empty array)
      setTreeData((prev) => applyChildren(prev, id, []))

      try {
        const children = await trpcClient.features.getFeatureChildren.query({ parentId: id })
        const lazyChildren: LazyTreeNode[] = children.map((c) => ({
          ...c,
          children: c.hasChildren ? undefined : null,
        }))
        setTreeData((prev) => applyChildren(prev, id, lazyChildren))
      } catch {
        // Reset to undefined so user can retry on next toggle
        setTreeData((prev) =>
          prev.map(function resetNode(n): LazyTreeNode {
            if (n.id === id) return { ...n, children: undefined }
            if (n.children && n.children.length > 0) return { ...n, children: n.children.map(resetNode) }
            return n
          }),
        )
      }
    },
    [treeData, trpcClient],
  )

  const handleActivate = useCallback(
    (node: { data: LazyTreeNode }) => { setSelectedId(node.data.id) },
    [],
  )

  const childrenAccessor = useCallback(
    (node: LazyTreeNode): LazyTreeNode[] | null =>
      node.children === undefined ? [] : (node.children ?? null),
    [],
  )

  const searchMatch = useCallback(
    (node: { data: LazyTreeNode }, term: string) => {
      const t = term.toLowerCase()
      return (
        node.data.title.toLowerCase().includes(t) ||
        node.data.featureKey.toLowerCase().includes(t) ||
        node.data.problem.toLowerCase().includes(t)
      )
    },
    [],
  )

  if (isLoading) {
    return (
      <div className="flex h-[calc(100dvh-7rem)] overflow-hidden">
        <div className="flex w-80 shrink-0 flex-col border-r border-border p-3 gap-2">
          <div className="h-8 w-full animate-pulse rounded bg-muted mb-1" />
          {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
            <div key={i} className="h-8 animate-pulse rounded bg-muted"
              style={{ marginLeft: `${[0, 0, 16, 32, 0, 16, 0, 0, 16, 32][i]}px` }} />
          ))}
        </div>
        <div className="flex flex-1 flex-col gap-4 p-6">
          <div className="h-5 w-32 animate-pulse rounded bg-muted" />
          <div className="h-8 w-64 animate-pulse rounded bg-muted" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-[calc(100dvh-7rem)] overflow-hidden">
      {/* ── Left: tree list ── */}
      <div className="flex w-80 shrink-0 flex-col border-r border-border">
        {/* Filter */}
        <div className="flex items-center gap-2 border-b border-border px-3 py-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            className="shrink-0 text-muted-foreground" aria-hidden="true">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
          <input
            type="text"
            value={filterTerm}
            onChange={(e) => { setFilterTerm(e.target.value) }}
            placeholder="Filter…"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          {filterTerm.length > 0 && (
            <button type="button" onClick={() => { setFilterTerm('') }}
              aria-label="Clear filter" className="text-muted-foreground transition-colors hover:text-foreground">
              ✕
            </button>
          )}
        </div>

        {/* Stats strip */}
        <div className="flex items-center gap-3 border-b border-border px-3 py-1.5 text-xs text-muted-foreground">
          <span>{roots.length} root features</span>
        </div>

        {/* Tree */}
        <div ref={treeContainerRef} className="min-h-0 flex-1 overflow-hidden">
          <Tree<LazyTreeNode>
            data={treeData}
            openByDefault={false}
            searchTerm={filterTerm}
            searchMatch={searchMatch}
            rowHeight={44}
            indent={20}
            width={treeWidth}
            height={treeHeight}
            onActivate={handleActivate}
            onToggle={(id) => { void handleToggle(id) }}
            selection={selectedId ?? undefined}
            childrenAccessor={childrenAccessor}
            disableDrag
            disableDrop
          >
            {LazyFeatureTreeNode as ElementType}
          </Tree>
        </div>
      </div>

      {/* ── Right: detail panel ── */}
      <div className="min-w-0 flex-1 overflow-y-auto">
        {selectedId ? <FeatureTreePanel nodeId={selectedId} /> : <EmptyPanel />}
      </div>
    </div>
  )
}

"use client"

import type { NodeRendererProps } from 'react-arborist'

import { LIFECYCLE_STAGES } from '@life-as-code/validators'

import type { TreeFeatureNode } from '@/lib/build-tree'
import { getTitle, countFilledStages } from '@/lib/feature-content'

import { FeatureStateBadge } from './feature-state-badge'
import { StageCompletionIndicator } from './stage-completion-indicator'

/**
 * Compact tree row — always a fixed height so react-arborist virtualization works correctly.
 *
 * No inline expanded section. The old approach rendered extra content inside the
 * fixed-height row, which overflowed into the row below. Detail content now lives
 * in FeatureTreePanel (the right-side panel in FeatureTree).
 */
export function FeatureTreeNode({ node, style }: NodeRendererProps<TreeFeatureNode>) {
  const title = getTitle(node.data.content)
  const completedStages = countFilledStages(node.data.content)
  const displayTitle = title !== 'Untitled' ? title : node.data.featureKey

  return (
    <div
      style={{ ...style, paddingLeft: `${node.level * 20 + 8}px` }}
      className={`flex items-center gap-2 border-b border-border/30 pr-3 transition-colors ${
        node.isSelected ? 'bg-primary/10' : 'hover:bg-muted/60'
      }`}
    >
      {/* Expand/collapse — invisible placeholder for leaves keeps layout consistent */}
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); node.toggle() }}
        aria-label={node.isOpen ? 'Collapse' : 'Expand'}
        className={`shrink-0 flex h-4 w-4 items-center justify-center rounded text-xs text-muted-foreground transition-colors hover:text-foreground ${
          node.data.children.length === 0 ? 'invisible' : ''
        }`}
      >
        {node.isOpen ? '▾' : '▸'}
      </button>

      {/* Key */}
      <span className="shrink-0 font-mono text-[11px] text-muted-foreground leading-none">
        {node.data.featureKey}
      </span>

      {/* Title */}
      <span className="min-w-0 flex-1 truncate text-sm leading-none">
        {displayTitle}
      </span>

      {/* Status icon */}
      <FeatureStateBadge status={node.data.status} frozen={node.data.frozen} variant="compact" />

      {/* Stage pips */}
      <StageCompletionIndicator completedStages={completedStages} totalStages={LIFECYCLE_STAGES.length} />
    </div>
  )
}

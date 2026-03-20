/**
 * AnnotationIcon — maps annotation types to their corresponding emoji icon.
 *
 * Types:
 *   decision        ⚖️  — a choice or tradeoff that was made
 *   warning         ⚠️  — something that could go wrong or needs care
 *   assumption      💭  — an unverified belief the team is acting on
 *   lesson          📚  — something learned, typically post-hoc
 *   breaking-change 🔴  — a change that breaks existing behaviour
 *   question        ❓  — an open question that needs an answer
 *   tech-debt       🔧  — a known shortcut or quality compromise
 */

export type AnnotationType =
  | 'decision'
  | 'warning'
  | 'assumption'
  | 'lesson'
  | 'breaking-change'
  | 'question'
  | 'tech-debt'

const ANNOTATION_ICONS: Record<AnnotationType, string> = {
  decision: '⚖️',
  warning: '⚠️',
  assumption: '💭',
  lesson: '📚',
  'breaking-change': '🔴',
  question: '❓',
  'tech-debt': '🔧',
}

const ANNOTATION_LABELS: Record<AnnotationType, string> = {
  decision: 'Decision',
  warning: 'Warning',
  assumption: 'Assumption',
  lesson: 'Lesson',
  'breaking-change': 'Breaking Change',
  question: 'Question',
  'tech-debt': 'Tech Debt',
}

interface AnnotationIconProps {
  type: AnnotationType
  /** Whether to show a text label alongside the icon. Default: false. */
  showLabel?: boolean
  className?: string
}

export function AnnotationIcon({ type, showLabel = false, className = '' }: AnnotationIconProps) {
  const icon = ANNOTATION_ICONS[type]
  const label = ANNOTATION_LABELS[type]

  return (
    <span
      className={`inline-flex items-center gap-1 ${className}`}
      title={label}
      aria-label={label}
    >
      <span aria-hidden="true" role="img">{icon}</span>
      {showLabel && (
        <span className="text-xs text-muted-foreground">{label}</span>
      )}
    </span>
  )
}

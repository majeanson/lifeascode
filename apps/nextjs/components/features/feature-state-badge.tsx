interface FeatureStateBadgeProps {
  status: 'active' | 'draft' | 'frozen' | 'flagged'
  frozen: boolean
  variant?: 'full' | 'compact'
}

const STATE_STYLES = {
  frozen: {
    className: 'text-purple-600 bg-purple-50 dark:bg-purple-950 dark:text-purple-300',
    label: 'Frozen',
    icon: '✦',
  },
  active: {
    className: 'text-blue-600 bg-blue-50 dark:bg-blue-950 dark:text-blue-300',
    label: 'Active',
    icon: '●',
  },
  draft: {
    className: 'text-muted-foreground bg-muted',
    label: 'Draft',
    icon: '○',
  },
  flagged: {
    className: 'text-amber-600 bg-amber-50 dark:bg-amber-950 dark:text-amber-300',
    label: 'Needs attention',
    icon: '⚑',
  },
} as const

export function FeatureStateBadge({ status, frozen, variant = 'full' }: FeatureStateBadgeProps) {
  const state = frozen ? 'frozen' : status
  const { className, label, icon } = STATE_STYLES[state]

  if (variant === 'compact') {
    return (
      <span
        role="img"
        aria-label={`Feature status: ${state}`}
        className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-xs font-medium ${className}`}
      >
        {icon}
      </span>
    )
  }

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${className}`}>
      {icon} {label}
    </span>
  )
}

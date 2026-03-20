import type { ReactNode } from 'react'

import { Button } from '@life-as-code/ui'

interface EmptyStateAction {
  label: string
  onClick?: () => void
  href?: string
}

interface EmptyStateProps {
  /** Optional icon slot — renders above the title. */
  icon?: ReactNode
  title: string
  description?: string
  /** Optional call-to-action button or link. */
  action?: EmptyStateAction
  className?: string
}

/**
 * EmptyState — a reusable component for empty list/tab states.
 *
 * Usage:
 *   <EmptyState
 *     icon={<span>📭</span>}
 *     title="No decisions yet"
 *     description="Add a decision in the edit view."
 *     action={{ label: 'Open wizard', href: '/features/123/wizard' }}
 *   />
 */
export function EmptyState({ icon, title, description, action, className = '' }: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center gap-3 rounded-lg border border-dashed border-border px-6 py-10 text-center ${className}`}
    >
      {icon && (
        <div className="text-3xl text-muted-foreground" aria-hidden="true">
          {icon}
        </div>
      )}
      <p className="text-sm font-medium text-foreground">{title}</p>
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
      {action && (
        action.href ? (
          <a
            href={action.href}
            className="mt-1 inline-block text-sm text-primary underline-offset-2 hover:underline"
          >
            {action.label}
          </a>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={action.onClick}
            className="mt-1"
          >
            {action.label}
          </Button>
        )
      )}
    </div>
  )
}

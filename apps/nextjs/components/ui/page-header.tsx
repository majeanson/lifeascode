import type { ReactNode } from 'react'

interface PageHeaderProps {
  title: string
  description?: string
  /** Optional slot for a primary action (e.g. a "+ New Feature" button). */
  action?: ReactNode
}

/**
 * Shared page-level header: title, optional subtitle, optional right-side action slot.
 * Use on every top-level page for consistent vertical rhythm and typography.
 *
 * Usage:
 *   <PageHeader title="Features" description="All documented features" action={<Button>+ New</Button>} />
 */
export function PageHeader({ title, description, action }: PageHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{title}</h1>
        {description && (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}

import type { VariantProps } from 'class-variance-authority'

import { cva } from 'class-variance-authority'

import { cn } from '@/utils'

const dotVariants = cva('inline-block h-[6px] w-[6px] rounded-full', {
  variants: {
    state: {
      saved: 'bg-emerald-500',
      saving: 'animate-pulse bg-amber-500',
      error: 'bg-red-500',
    },
  },
  defaultVariants: {
    state: 'saved',
  },
})

const labelMap: Record<SaveIndicatorState, string> = {
  saved: 'Saved',
  saving: 'Saving...',
  error: 'Save failed — retry?',
}

export type SaveIndicatorState = 'saved' | 'saving' | 'error'

export interface SaveIndicatorProps extends VariantProps<typeof dotVariants> {
  state: SaveIndicatorState
  className?: string
}

export function SaveIndicator({ state, className }: SaveIndicatorProps) {
  return (
    <span
      role="status"
      aria-live="polite"
      className={cn('inline-flex items-center gap-1.5 text-xs text-muted-foreground', className)}
    >
      <span className={dotVariants({ state })} aria-hidden />
      <span>{labelMap[state]}</span>
    </span>
  )
}

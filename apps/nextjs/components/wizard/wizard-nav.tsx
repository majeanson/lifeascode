"use client"

import { Button, SaveIndicator } from '@life-as-code/ui'
import type { SaveIndicatorState } from '@life-as-code/ui'

interface WizardNavProps {
  onPrev: () => void
  onNext: () => void
  hasPrev: boolean
  hasNext: boolean
  saveState: SaveIndicatorState
  prevLabel?: string
  nextLabel?: string
}

export function WizardNav({ onPrev, onNext, hasPrev, hasNext, saveState, prevLabel = '← Prev', nextLabel = 'Next →' }: WizardNavProps) {
  return (
    <div className="flex items-center justify-between border-t border-border px-4 py-3">
      <SaveIndicator state={saveState} />
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={!hasPrev}
          onClick={onPrev}
          aria-label="Previous"
        >
          {prevLabel}
        </Button>
        <Button
          type="button"
          variant="default"
          disabled={!hasNext}
          onClick={onNext}
          aria-label="Next"
        >
          {nextLabel}
        </Button>
      </div>
    </div>
  )
}

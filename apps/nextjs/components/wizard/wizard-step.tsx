"use client"

import { useEffect, useId, useRef } from 'react'

interface WizardStepProps {
  stageLabel: string
  prompt: string
  hintText?: string
  value: string
  onChange: (v: string) => void
  onAdvance: () => void
  onSkip?: () => void
  subStepIndex?: number
  totalSubSteps?: number
  required?: boolean
  validationError?: string
  schemaAlert?: string
  autoFocus?: boolean
}

export function WizardStep({
  stageLabel,
  prompt,
  hintText,
  value,
  onChange,
  onAdvance,
  onSkip,
  subStepIndex = 0,
  totalSubSteps = 1,
  required = true,
  validationError,
  schemaAlert,
  autoFocus = true,
}: WizardStepProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const promptId = useId()
  const hintId = useId()
  const errorId = useId()

  useEffect(() => {
    if (autoFocus) {
      textareaRef.current?.focus()
    }
  }, [autoFocus, subStepIndex])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      onAdvance()
    }
  }

  const describedBy = [promptId, hintText ? hintId : null, validationError ? errorId : null]
    .filter(Boolean)
    .join(' ')

  return (
    <div className="flex flex-col gap-6 px-4 py-8">
      {/* Stage label + sub-step progress */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          {stageLabel}
        </span>
        {totalSubSteps > 1 && (
          <div className="flex items-center gap-1.5" aria-label={`Question ${subStepIndex + 1} of ${totalSubSteps}`}>
            {Array.from({ length: totalSubSteps }, (_, i) => i).map((i) => (
              <span
                key={`substep-${i}`}
                className={`h-1.5 rounded-full transition-all ${
                  i === subStepIndex
                    ? 'w-4 bg-primary'
                    : i < subStepIndex
                      ? 'w-1.5 bg-primary/40'
                      : 'w-1.5 bg-border'
                }`}
              />
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <h2 id={promptId} className="text-2xl font-bold leading-snug text-foreground">
          {prompt}
        </h2>
        {hintText && (
          <p id={hintId} className="text-sm text-muted-foreground">
            {hintText}
          </p>
        )}
      </div>

      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        aria-describedby={describedBy}
        aria-invalid={validationError ? true : undefined}
        rows={4}
        className={`w-full resize-none rounded-md border bg-background px-3 py-2 text-base text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 [field-sizing:content] ${
          validationError
            ? 'border-destructive focus-visible:ring-destructive'
            : schemaAlert
              ? 'border-amber-400 focus-visible:ring-amber-400'
              : 'border-input focus-visible:ring-ring'
        }`}
        style={{ minHeight: '8rem' }}
      />

      {validationError && (
        <p id={errorId} role="alert" className="text-sm text-destructive">
          {validationError}
        </p>
      )}

      {!validationError && schemaAlert && (
        <p className="text-sm text-amber-600 dark:text-amber-400">
          ⚑ {schemaAlert}
        </p>
      )}

      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Press <kbd className="rounded border border-border px-1 py-0.5 font-mono text-xs">Enter</kbd> to continue
          {' • '}
          <kbd className="rounded border border-border px-1 py-0.5 font-mono text-xs">Shift+Enter</kbd> for new line
        </p>
        {!required && onSkip && (
          <button
            type="button"
            onClick={onSkip}
            className="text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
          >
            Skip (optional) →
          </button>
        )}
      </div>
    </div>
  )
}

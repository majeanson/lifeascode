"use client"

import { useEffect, useState } from 'react'

import type { LifecycleStage } from '@life-as-code/validators'

import type { CompletionLevel } from '@/stores/wizard-store'

import { STAGE_FIELD_CONFIGS } from './stage-fields'

interface WizardCanvasProps {
  stage: LifecycleStage
  stageContent: Record<string, unknown>
  onFieldChange: (fieldKey: string, value: string) => void
  completionLevel: CompletionLevel
}

export function WizardCanvas({ stage, stageContent, onFieldChange, completionLevel }: WizardCanvasProps) {
  const [showExtended, setShowExtended] = useState(false)
  // Local state for field values — undefined means "fall through to stageContent"
  const [localValues, setLocalValues] = useState<Record<string, string>>({})
  // Reset when stage changes
  useEffect(() => {
    setLocalValues({})
  }, [stage])

  const allFields = STAGE_FIELD_CONFIGS[stage]

  const visibleFields = allFields.filter((f) => {
    if (completionLevel === 'deep') return true
    if (completionLevel === 'standard') return f.tier !== 'extended'
    return f.tier === 'required' // quick
  })

  const extendedFields = allFields.filter((f) => f.tier === 'extended')
  const hasExtendedToggle = completionLevel !== 'deep' && extendedFields.length > 0

  const mainFields = visibleFields.filter((f) => f.tier !== 'extended')
  const shownExtendedFields =
    showExtended || completionLevel === 'deep' ? visibleFields.filter((f) => f.tier === 'extended') : []

  return (
    <div className="p-6">
      {/* Required + Standard fields in responsive 2-col grid */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {mainFields.map((field) => {
          const labelId = `field-label-${field.key}`
          const value = localValues[field.key] ?? (stageContent[field.key] as string | undefined) ?? ''
          return (
            <div key={field.key} role="group" aria-labelledby={labelId}>
              <label
                id={labelId}
                htmlFor={`field-${field.key}`}
                className={`mb-1 block text-sm font-medium ${field.tier === 'standard' ? 'text-muted-foreground' : ''}`}
              >
                {field.label}
                {field.tier === 'required' && (
                  <span className="ml-1 text-destructive" aria-hidden="true">
                    *
                  </span>
                )}
              </label>
              <textarea
                id={`field-${field.key}`}
                aria-labelledby={labelId}
                className={`w-full resize-none rounded-md border bg-background p-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${value ? 'border-border' : 'border-input'}`}
                style={{ fieldSizing: 'content' } as React.CSSProperties}
                rows={3}
                placeholder={field.placeholder}
                value={value}
                onChange={(e) => {
                  setLocalValues((prev) => ({ ...prev, [field.key]: e.target.value }))
                  onFieldChange(field.key, e.target.value)
                }}
              />
            </div>
          )
        })}
      </div>

      {/* Extended fields (shown when expanded or completionLevel=deep) */}
      {shownExtendedFields.length > 0 && (
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          {shownExtendedFields.map((field) => {
            const labelId = `field-label-${field.key}`
            const value = localValues[field.key] ?? (stageContent[field.key] as string | undefined) ?? ''
            return (
              <div key={field.key} role="group" aria-labelledby={labelId}>
                <label
                  id={labelId}
                  htmlFor={`field-${field.key}`}
                  className="mb-1 block text-sm font-medium text-muted-foreground"
                >
                  {field.label}
                </label>
                <textarea
                  id={`field-${field.key}`}
                  aria-labelledby={labelId}
                  className="w-full resize-none rounded-md border border-input bg-background p-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  style={{ fieldSizing: 'content' } as React.CSSProperties}
                  rows={3}
                  placeholder={field.placeholder}
                  value={value}
                  onChange={(e) => {
                    setLocalValues((prev) => ({ ...prev, [field.key]: e.target.value }))
                    onFieldChange(field.key, e.target.value)
                  }}
                />
              </div>
            )
          })}
        </div>
      )}

      {/* Show extended toggle */}
      {hasExtendedToggle && (
        <button
          type="button"
          onClick={() => {
            setShowExtended((prev) => !prev)
          }}
          className="mt-4 text-sm text-muted-foreground hover:text-foreground"
          aria-expanded={showExtended}
        >
          {showExtended ? 'Hide extended fields ▴' : 'Show extended fields ▾'}
        </button>
      )}
    </div>
  )
}

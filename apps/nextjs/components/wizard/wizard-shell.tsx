"use client"

import { useCallback, useEffect, useRef, useState } from 'react'

import { useQuery, useMutation } from '@tanstack/react-query'
import Link from 'next/link'

import { Button, SaveIndicator } from '@life-as-code/ui'
import { LIFECYCLE_STAGES } from '@life-as-code/validators'
import type { DecisionEntry, LifecycleStage } from '@life-as-code/validators'

import { useTRPC } from '@/trpc/react'
import { useWizardStore } from '@/stores/wizard-store'
import { STAGE_LABEL } from '@/lib/stage-labels'
import { FeatureStateBadge } from '@/components/features/feature-state-badge'
import { SpawnDialog } from '@/components/features/spawn-dialog'

import { DecisionLogPanel } from './decision-log-panel'
import { TagInput } from './tag-input'
import { TitleInput } from './title-input'
import { WizardCanvas } from './wizard-canvas'
import { WizardNav } from './wizard-nav'
import { WizardProgress } from './wizard-progress'
import { WizardStep } from './wizard-step'
import { type FieldConfig, STAGE_FIELD_CONFIGS } from './stage-fields'

interface WizardShellProps {
  featureId: string
  /**
   * When true, the wizard is embedded inside another surface (e.g. the Edit tab
   * of FeatureDetailView). In inline mode:
   *   - The top progress bar is hidden (the caller shows stage count in its tab label).
   *   - The bottom Prev/Next footer is hidden (users navigate stages via the tab bar).
   *   - The save indicator moves inline next to the mode toggle.
   *   - The outer container uses normal document flow instead of h-full flex.
   */
  inline?: boolean
}

export function WizardShell({ featureId, inline = false }: WizardShellProps) {
  const trpc = useTRPC()
  const { getLastEditedStage, setLastEditedStage, saveState, setSaveState, currentMode, setCurrentMode, completionLevel, setCompletionLevel } =
    useWizardStore()

  const [currentStage, setCurrentStage] = useState<LifecycleStage>(() =>
    getLastEditedStage(featureId),
  )
  const [currentSubStep, setCurrentSubStep] = useState(0)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingChangesRef = useRef<Record<string, string>>({})
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])
  const [validationError, setValidationError] = useState<string | null>(null)
  const [showSpawnDialog, setShowSpawnDialog] = useState(false)

  // Hydrate Zustand persist store client-side
  useEffect(() => {
    useWizardStore.persist.rehydrate()
  }, [])

  // Sync currentStage with store on featureId change
  useEffect(() => {
    setCurrentStage(getLastEditedStage(featureId))
    setCurrentSubStep(0)
  }, [featureId, getLastEditedStage])

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  const featureQuery = useQuery(trpc.features.getFeature.queryOptions({ id: featureId }))
  const activeSchemaQuery = useQuery(trpc.features.admin.getActiveSchema.queryOptions({}))
  const updateStageMutation = useMutation(trpc.features.updateStage.mutationOptions())

  const content = featureQuery.data?.content as Record<string, Record<string, unknown>> | undefined
  const decisions = (content?.[currentStage]?.decisions as DecisionEntry[]) ?? []
  const rawTags = content?.tags
  const tags = Array.isArray(rawTags) ? rawTags.filter((t): t is string => typeof t === 'string') : []
  const title = (content?.title as string | undefined) ?? ''

  const completedCount = LIFECYCLE_STAGES.filter((stage) => {
    const s = content?.[stage]
    return s && Object.values(s).some((v) => typeof v === 'string' && v.trim().length > 0)
  }).length

  const currentIndex = LIFECYCLE_STAGES.indexOf(currentStage)
  const stageFields = STAGE_FIELD_CONFIGS[currentStage]
  const currentFieldConfig = (stageFields[currentSubStep] ?? stageFields[0]) as FieldConfig
  const fieldKey = currentFieldConfig.key
  const stageValue = (content?.[currentStage]?.[fieldKey] as string | undefined) ?? ''

  const [localStageValue, setLocalStageValue] = useState<string | undefined>()
  useEffect(() => {
    setLocalStageValue(undefined)
  }, [currentStage, currentSubStep])

  const hasPrev = currentMode === 'focus'
    ? currentIndex > 0 || currentSubStep > 0
    : currentIndex > 0
  const hasNext = currentMode === 'focus'
    ? currentIndex < LIFECYCLE_STAGES.length - 1 || currentSubStep < stageFields.length - 1
    : currentIndex < LIFECYCLE_STAGES.length - 1

  const handleStageChange = useCallback(
    (stage: LifecycleStage, subStep = 0) => {
      pendingChangesRef.current = {}
      setValidationError(null)
      setSaveState('saved')
      setCurrentStage(stage)
      setCurrentSubStep(subStep)
      setLocalStageValue(undefined)
      setLastEditedStage(featureId, stage)
    },
    [featureId, setLastEditedStage, setSaveState],
  )

  const handleNext = useCallback(() => {
    if (currentMode === 'focus') {
      if (currentFieldConfig.tier === 'required' && !(localStageValue ?? stageValue).trim()) {
        setValidationError('This question needs an answer before you continue.')
        return
      }
      setValidationError(null)
      if (currentSubStep < stageFields.length - 1) {
        setCurrentSubStep((prev) => prev + 1)
        setLocalStageValue(undefined)
        return
      }
    }
    const nextStage = LIFECYCLE_STAGES[currentIndex + 1]
    if (nextStage) handleStageChange(nextStage)
  }, [currentMode, currentFieldConfig, currentSubStep, stageFields, stageValue, localStageValue, currentIndex, handleStageChange])

  const handlePrev = useCallback(() => {
    if (currentMode === 'focus' && currentSubStep > 0) {
      setValidationError(null)
      setCurrentSubStep((prev) => prev - 1)
      setLocalStageValue(undefined)
      return
    }
    const prevStage = LIFECYCLE_STAGES[currentIndex - 1]
    if (prevStage) {
      const lastSubStep = currentMode === 'focus' ? STAGE_FIELD_CONFIGS[prevStage].length - 1 : 0
      handleStageChange(prevStage, lastSubStep)
    }
  }, [currentMode, currentSubStep, currentIndex, handleStageChange])

  const handleSkip = useCallback(() => {
    setValidationError(null)
    if (currentSubStep < stageFields.length - 1) {
      setCurrentSubStep((prev) => prev + 1)
      setLocalStageValue(undefined)
    } else {
      const nextStage = LIFECYCLE_STAGES[currentIndex + 1]
      if (nextStage) handleStageChange(nextStage)
    }
  }, [currentSubStep, stageFields, currentIndex, handleStageChange])

  const handleContentChange = useCallback(
    (value: string) => {
      setLocalStageValue(value)
      setValidationError(null)
      setSaveState('saving')
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => {
        const existingStageContent = (content?.[currentStage] as Record<string, unknown>) ?? {}
        updateStageMutation.mutate(
          { featureId, stage: currentStage, stageContent: { ...existingStageContent, [fieldKey]: value } },
          {
            onSuccess: () => setSaveState('saved'),
            onError: () => setSaveState('error'),
          },
        )
      }, 500)
    },
    [fieldKey, currentStage, featureId, content, setSaveState, updateStageMutation],
  )

  const handleFastModeFieldChange = useCallback(
    (fKey: string, value: string) => {
      setSaveState('saving')
      pendingChangesRef.current = { ...pendingChangesRef.current, [fKey]: value }
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => {
        const existingStageContent = (content?.[currentStage] as Record<string, unknown>) ?? {}
        const merged = { ...existingStageContent, ...pendingChangesRef.current }
        pendingChangesRef.current = {}
        updateStageMutation.mutate(
          { featureId, stage: currentStage, stageContent: merged },
          {
            onSuccess: () => setSaveState('saved'),
            onError: () => setSaveState('error'),
          },
        )
      }, 500)
    },
    [currentStage, featureId, content, setSaveState, updateStageMutation],
  )

  const handleTabKeyDown = useCallback(
    (e: React.KeyboardEvent, index: number) => {
      let next: number | null = null
      if (e.key === 'ArrowRight') next = (index + 1) % LIFECYCLE_STAGES.length
      else if (e.key === 'ArrowLeft') next = (index - 1 + LIFECYCLE_STAGES.length) % LIFECYCLE_STAGES.length
      else if (e.key === 'Home') next = 0
      else if (e.key === 'End') next = LIFECYCLE_STAGES.length - 1
      if (next !== null) {
        const nextStage = LIFECYCLE_STAGES[next]
        if (nextStage) {
          e.preventDefault()
          tabRefs.current[next]?.focus()
          handleStageChange(nextStage)
        }
      }
    },
    [handleStageChange],
  )

  const isLastSubStep = currentSubStep === stageFields.length - 1
  const isLastStage = currentIndex === LIFECYCLE_STAGES.length - 1
  const nextLabel = currentMode === 'focus' && !isLastSubStep ? 'Next question →' : isLastStage ? 'Done ✓' : 'Next →'
  const prevLabel = currentMode === 'focus' && currentSubStep > 0 ? '← Back' : '← Prev'

  const schemaAlert: string | undefined = (() => {
    if (featureQuery.data?.status !== 'flagged') return
    if (!activeSchemaQuery.data) return
    const isRequiredBySchema = activeSchemaQuery.data.config.requiredFields.some(
      (f) => f.enabled && f.name === fieldKey,
    )
    if (!isRequiredBySchema) return
    if ((localStageValue ?? stageValue).trim()) return
    return 'This field was added to the schema after this feature was created — please complete it'
  })()

  // Frozen feature intercept
  const isFrozen = featureQuery.data?.frozen ?? false
  if (isFrozen && featureQuery.data) {
    const frozenFeature = featureQuery.data
    const frozenContentMap = frozenFeature.content as Record<string, Record<string, unknown> & { title?: string }> | undefined
    const frozenTitle = (frozenContentMap?.title as string | undefined)?.trim()
      || (frozenContentMap?.problem?.problemStatement as string | undefined)?.trim()
      || 'Untitled'

    return (
      <div className="flex flex-col items-center justify-center gap-6 p-8 text-center">
        <FeatureStateBadge status="frozen" frozen />
        <div>
          <p className="font-mono text-sm text-muted-foreground">{frozenFeature.featureKey}</p>
          <h2 className="mt-1 text-lg font-semibold text-foreground">{frozenTitle}</h2>
        </div>
        <p className="max-w-md text-sm text-muted-foreground">
          This feature is frozen — its record is permanent. Want to evolve it? Spawn a child feature that links back to this one.
        </p>
        <Button
          type="button"
          variant="default"
          onClick={() => { setShowSpawnDialog(true) }}
        >
          Evolve this feature
        </Button>
        {showSpawnDialog && (
          <SpawnDialog
            parentId={frozenFeature.id}
            parentFeatureKey={frozenFeature.featureKey}
            parentTitle={frozenTitle}
            onClose={() => { setShowSpawnDialog(false) }}
          />
        )}
      </div>
    )
  }

  return (
    <div className={inline ? 'flex flex-col' : 'flex h-full flex-col'}>
      {/* Progress bar — hidden in inline mode; the parent tab label shows the count */}
      {!inline && (
        <WizardProgress completedCount={completedCount} totalCount={LIFECYCLE_STAGES.length} />
      )}

      {/* Stage tabs + mode toggle + (inline) save indicator */}
      <div className="flex items-center justify-between border-b border-border px-4 py-2">
        <ul role="tablist" aria-label="Lifecycle stages" aria-orientation="horizontal" className="flex gap-1 overflow-x-auto">
          {LIFECYCLE_STAGES.map((stage, index) => {
            const isActive = stage === currentStage
            return (
              <li key={stage}>
                <button
                  ref={(el) => { tabRefs.current[index] = el }}
                  type="button"
                  role="tab"
                  id={`wizard-tab-${stage}`}
                  aria-selected={isActive}
                  aria-controls="wizard-tabpanel"
                  tabIndex={isActive ? 0 : -1}
                  onClick={() => handleStageChange(stage)}
                  onKeyDown={(e) => handleTabKeyDown(e, index)}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  {STAGE_LABEL[stage]}
                </button>
              </li>
            )
          })}
        </ul>

        <div className="flex shrink-0 items-center gap-1 pl-2">
          {/* In inline mode show the save indicator here instead of in the footer */}
          {inline && <SaveIndicator state={saveState} />}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-pressed={currentMode === 'focus'}
            onClick={() => setCurrentMode('focus')}
          >
            🎯 Guided
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-pressed={currentMode === 'fast'}
            onClick={() => setCurrentMode('fast')}
          >
            ⚡ Expert
          </Button>
          <Link
            href={`/features/${featureId}/json`}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1"
          >
            JSON →
          </Link>
        </div>
      </div>

      {/* Title strip */}
      <div className="flex items-center gap-2 border-b border-border px-4 py-2">
        <span className="shrink-0 text-xs text-muted-foreground">Title:</span>
        <TitleInput featureId={featureId} value={title} />
      </div>

      {/* Tags strip */}
      <div className="flex items-center gap-2 border-b border-border px-4 py-2">
        <span className="shrink-0 text-xs text-muted-foreground">Tags:</span>
        <TagInput featureId={featureId} tags={tags} />
      </div>

      {/* Main content area */}
      <div
        id="wizard-tabpanel"
        role="tabpanel"
        aria-labelledby={`wizard-tab-${currentStage}`}
        className={inline ? 'overflow-y-auto' : 'min-h-0 flex-1 overflow-y-auto'}
      >
        {currentMode === 'focus' ? (
          <div className="flex flex-col">
            <WizardStep
              stageLabel={STAGE_LABEL[currentStage]}
              prompt={currentFieldConfig.guidedPrompt}
              hintText={currentFieldConfig.guidedHint}
              value={localStageValue ?? stageValue}
              onChange={handleContentChange}
              onAdvance={handleNext}
              onSkip={currentFieldConfig.tier === 'required' ? undefined : handleSkip}
              subStepIndex={currentSubStep}
              totalSubSteps={stageFields.length}
              required={currentFieldConfig.tier === 'required'}
              validationError={validationError ?? undefined}
              schemaAlert={schemaAlert}
            />
            <div className="border-t border-border px-4 py-3">
              <DecisionLogPanel featureId={featureId} stage={currentStage} decisions={decisions} />
            </div>
          </div>
        ) : (
          <div className="flex flex-col">
            {/* Completion level segmented control */}
            <div className="flex items-center gap-1 border-b border-border px-6 py-2">
              <span className="mr-2 text-xs text-muted-foreground">Depth:</span>
              {(['quick', 'standard', 'deep'] as const).map((level) => (
                <Button
                  key={level}
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-pressed={completionLevel === level}
                  onClick={() => setCompletionLevel(level)}
                  className="capitalize"
                >
                  {level}
                </Button>
              ))}
            </div>
            <WizardCanvas
              stage={currentStage}
              stageContent={(content?.[currentStage] as Record<string, unknown>) ?? {}}
              onFieldChange={handleFastModeFieldChange}
              completionLevel={completionLevel}
            />
            <div className="border-t border-border px-4 py-3">
              <DecisionLogPanel featureId={featureId} stage={currentStage} decisions={decisions} />
            </div>
          </div>
        )}
      </div>

      {/* Footer nav — hidden in inline mode; stage tabs provide navigation */}
      {!inline && (
        <WizardNav
          onPrev={handlePrev}
          onNext={handleNext}
          hasPrev={hasPrev}
          hasNext={hasNext}
          saveState={saveState}
          prevLabel={prevLabel}
          nextLabel={nextLabel}
        />
      )}
    </div>
  )
}

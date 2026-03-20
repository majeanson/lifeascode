"use client"

import { WizardStep } from '@/components/wizard/wizard-step'

interface AnalysisStepProps {
  value: string
  onChange: (v: string) => void
  onAdvance: () => void
}

export function AnalysisStep({ value, onChange, onAdvance }: AnalysisStepProps) {
  return (
    <WizardStep
      stageLabel="Analysis"
      prompt="What analysis supports solving this problem?"
      hintText="Have you considered edge cases? What should this feature NOT do?"
      value={value}
      onChange={onChange}
      onAdvance={onAdvance}
    />
  )
}

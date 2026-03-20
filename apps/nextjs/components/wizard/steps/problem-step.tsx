"use client"

import { WizardStep } from '@/components/wizard/wizard-step'

interface ProblemStepProps {
  value: string
  onChange: (v: string) => void
  onAdvance: () => void
}

export function ProblemStep({ value, onChange, onAdvance }: ProblemStepProps) {
  return (
    <WizardStep
      stageLabel="Problem"
      prompt="What human problem triggered this feature?"
      value={value}
      onChange={onChange}
      onAdvance={onAdvance}
    />
  )
}

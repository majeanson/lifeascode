"use client"

import { WizardStep } from '@/components/wizard/wizard-step'

interface RequirementsStepProps {
  value: string
  onChange: (v: string) => void
  onAdvance: () => void
}

export function RequirementsStep({ value, onChange, onAdvance }: RequirementsStepProps) {
  return (
    <WizardStep
      stageLabel="Requirements"
      prompt="What must this feature do? List the requirements."
      value={value}
      onChange={onChange}
      onAdvance={onAdvance}
    />
  )
}

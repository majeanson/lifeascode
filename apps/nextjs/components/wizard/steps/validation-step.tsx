"use client"

import { WizardStep } from '@/components/wizard/wizard-step'

interface ValidationStepProps {
  value: string
  onChange: (v: string) => void
  onAdvance: () => void
}

export function ValidationStep({ value, onChange, onAdvance }: ValidationStepProps) {
  return (
    <WizardStep
      stageLabel="Validation"
      prompt="How will this feature be validated and tested?"
      value={value}
      onChange={onChange}
      onAdvance={onAdvance}
    />
  )
}

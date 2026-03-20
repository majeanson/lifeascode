"use client"

import { WizardStep } from '@/components/wizard/wizard-step'

interface ImplementationStepProps {
  value: string
  onChange: (v: string) => void
  onAdvance: () => void
}

export function ImplementationStep({ value, onChange, onAdvance }: ImplementationStepProps) {
  return (
    <WizardStep
      stageLabel="Implementation"
      prompt="How will this be implemented?"
      value={value}
      onChange={onChange}
      onAdvance={onAdvance}
    />
  )
}

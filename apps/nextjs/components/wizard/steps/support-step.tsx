"use client"

import { WizardStep } from '@/components/wizard/wizard-step'

interface SupportStepProps {
  value: string
  onChange: (v: string) => void
  onAdvance: () => void
}

export function SupportStep({ value, onChange, onAdvance }: SupportStepProps) {
  return (
    <WizardStep
      stageLabel="Support"
      prompt="What support considerations exist post-delivery?"
      value={value}
      onChange={onChange}
      onAdvance={onAdvance}
    />
  )
}

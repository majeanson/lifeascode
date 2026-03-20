"use client"

import { WizardStep } from '@/components/wizard/wizard-step'

interface DocumentationStepProps {
  value: string
  onChange: (v: string) => void
  onAdvance: () => void
}

export function DocumentationStep({ value, onChange, onAdvance }: DocumentationStepProps) {
  return (
    <WizardStep
      stageLabel="Documentation"
      prompt="What documentation does this feature require?"
      value={value}
      onChange={onChange}
      onAdvance={onAdvance}
    />
  )
}

"use client"

import { WizardStep } from '@/components/wizard/wizard-step'

interface DesignStepProps {
  value: string
  onChange: (v: string) => void
  onAdvance: () => void
}

export function DesignStep({ value, onChange, onAdvance }: DesignStepProps) {
  return (
    <WizardStep
      stageLabel="Design"
      prompt="How should this feature be designed?"
      value={value}
      onChange={onChange}
      onAdvance={onAdvance}
    />
  )
}

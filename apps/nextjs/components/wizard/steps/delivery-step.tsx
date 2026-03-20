"use client"

import { WizardStep } from '@/components/wizard/wizard-step'

interface DeliveryStepProps {
  value: string
  onChange: (v: string) => void
  onAdvance: () => void
}

export function DeliveryStep({ value, onChange, onAdvance }: DeliveryStepProps) {
  return (
    <WizardStep
      stageLabel="Delivery"
      prompt="What is the delivery plan for this feature?"
      value={value}
      onChange={onChange}
      onAdvance={onAdvance}
    />
  )
}

"use client"

interface WizardProgressProps {
  completedCount: number
  totalCount: number
}

export function WizardProgress({ completedCount, totalCount }: WizardProgressProps) {
  const percent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0

  return (
    <div
      role="progressbar"
      aria-valuenow={completedCount}
      aria-valuemin={0}
      aria-valuemax={totalCount}
      aria-label="Lifecycle stage completion"
      className="h-[2px] w-full bg-muted"
    >
      <div
        className="h-full bg-primary transition-all duration-300"
        style={{ width: `${percent}%` }}
      />
    </div>
  )
}

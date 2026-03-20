interface StageCompletionIndicatorProps {
  completedStages: number
  totalStages: number
}

export function StageCompletionIndicator({ completedStages, totalStages }: StageCompletionIndicatorProps) {
  const filledPips = Math.min(5, Math.max(0, Math.round((completedStages / totalStages) * 5)))

  return (
    <div
      role="img"
      aria-label={`${completedStages} of ${totalStages} lifecycle stages complete`}
      className="flex gap-1"
    >
      {Array.from({ length: 5 }, (_, i) => (
        <span
          key={i}
          className={
            i < filledPips
              ? 'w-2 h-2 rounded-full bg-primary'
              : 'w-2 h-2 rounded-full bg-muted border border-border'
          }
        />
      ))}
    </div>
  )
}

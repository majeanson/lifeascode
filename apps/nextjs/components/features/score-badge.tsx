"use client"

interface ScoreBadgeProps {
  score: number | null
}

function scoreColor(score: number): string {
  if (score <= 3) return 'text-destructive'
  if (score <= 6) return 'text-amber-500'
  return 'text-primary'
}

export function ScoreBadge({ score }: ScoreBadgeProps) {
  if (score === null) {
    return (
      <span className="font-mono text-xs text-muted-foreground" aria-label="Unscored">
        –
      </span>
    )
  }
  return (
    <span className={`font-mono text-xs ${scoreColor(score)}`} aria-label={`Score: ${score}`}>
      ◆ {score}
    </span>
  )
}

"use client"

interface CompletenessHistogramProps {
  /** Completeness values 0-100 for each feature */
  values: number[]
}

/**
 * A simple SVG bar chart showing the distribution of completeness percentages
 * across features, bucketed into 10% ranges (0-9%, 10-19%, ... 90-100%).
 */
export function CompletenessHistogram({ values }: CompletenessHistogramProps) {
  if (values.length === 0) {
    return (
      <div className="flex h-16 items-center justify-center text-xs text-muted-foreground">
        No data
      </div>
    )
  }

  // Bucket into 10% ranges: index 0 = 0-9%, ..., index 9 = 90-100%
  const buckets = Array.from({ length: 10 }, () => 0) as number[]
  for (const v of values) {
    const idx = Math.min(9, Math.floor(v / 10))
    buckets[idx] = (buckets[idx] ?? 0) + 1
  }

  const maxCount = Math.max(...buckets, 1)

  const WIDTH = 220
  const HEIGHT = 48
  const BAR_GAP = 2
  const barWidth = (WIDTH - BAR_GAP * 9) / 10

  return (
    <div className="flex flex-col gap-1">
      <p className="text-xs font-medium text-muted-foreground">Completeness distribution</p>
      <svg
        width={WIDTH}
        height={HEIGHT + 12}
        aria-label="Completeness distribution histogram"
        role="img"
      >
        {buckets.map((count, i) => {
          const barHeight = Math.max(2, Math.round((count / maxCount) * HEIGHT))
          const x = i * (barWidth + BAR_GAP)
          const y = HEIGHT - barHeight

          // Color by bucket tier
          const fill =
            i >= 8 ? '#22c55e' :  // ≥80% → green
            i >= 4 ? '#eab308' :  // ≥40% → yellow
            '#ef4444'             // <40% → red

          return (
            <g key={i}>
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={barHeight}
                fill={fill}
                fillOpacity={0.8}
                rx={1}
              >
                <title>{`${i * 10}–${i * 10 + 9}%: ${count} feature${count === 1 ? '' : 's'}`}</title>
              </rect>
              {/* X-axis label every 2 buckets */}
              {i % 2 === 0 && (
                <text
                  x={x + barWidth / 2}
                  y={HEIGHT + 10}
                  textAnchor="middle"
                  fontSize={7}
                  fill="currentColor"
                  className="text-muted-foreground"
                  opacity={0.6}
                >
                  {i * 10}%
                </text>
              )}
            </g>
          )
        })}
      </svg>
    </div>
  )
}

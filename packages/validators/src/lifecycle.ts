export const LIFECYCLE_STAGES = [
  'problem',
  'analysis',
  'requirements',
  'design',
  'implementation',
  'validation',
  'documentation',
  'delivery',
  'support',
] as const

export type LifecycleStage = (typeof LIFECYCLE_STAGES)[number]

/**
 * Compute completeness percentage (0-100) from raw feature content.
 * A stage is "filled" when it exists and has at least one non-empty string value.
 * This is the canonical implementation — keep in sync with any SQL equivalents.
 */
export function computeCompletenessFromContent(content: unknown): number {
  const contentMap = content as Record<string, Record<string, unknown>> | null | undefined
  if (!contentMap) return 0
  const filled = LIFECYCLE_STAGES.filter((stage) => {
    const s = contentMap[stage]
    return s != null && Object.values(s).some((v) => typeof v === 'string' && v.trim().length > 0)
  }).length
  return Math.round((filled / LIFECYCLE_STAGES.length) * 100)
}

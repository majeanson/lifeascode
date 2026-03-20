import { LIFECYCLE_STAGES } from '@life-as-code/validators'

/**
 * Typed view of a feature's JSON content map.
 * Structure: { [stage]: { [fieldKey]: value }, tags: string[] }
 */
export type FeatureContentMap = Record<string, Record<string, unknown>>

/** Cast raw content to a typed map. Returns undefined for null/undefined input. */
export function getContentMap(content: unknown): FeatureContentMap | undefined {
  return content as FeatureContentMap | undefined
}

/**
 * Derive the display title.
 * Priority: content.title → content.problem.problemStatement → 'Untitled'
 */
export function getTitle(content: unknown): string {
  const m = getContentMap(content)
  return (m?.title as string | undefined)?.trim()
    || (m?.problem?.problemStatement as string | undefined)?.trim()
    || 'Untitled'
}

/** Extract the tags array. Always returns a plain string[]. */
export function getTags(content: unknown): string[] {
  const m = getContentMap(content)
  const raw = m?.tags
  return Array.isArray(raw) ? raw.filter((t): t is string => typeof t === 'string') : []
}

/**
 * Count how many lifecycle stages have at least one non-empty text field.
 * Used by: feature-card, feature-detail-view, home-overview, wizard-shell.
 */
export function countFilledStages(content: unknown): number {
  const m = getContentMap(content)
  if (!m) return 0
  return LIFECYCLE_STAGES.filter((stage) => {
    const s = m[stage]
    return s && Object.values(s).some((v) => typeof v === 'string' && v.trim().length > 0)
  }).length
}

/**
 * Completeness as a 0–100 integer percentage.
 * Note: CompletenessTable.tsx has an inline copy; prefer this shared version going forward.
 */
export function computeCompleteness(content: unknown): number {
  return Math.round((countFilledStages(content) / LIFECYCLE_STAGES.length) * 100)
}

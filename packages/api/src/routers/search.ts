import { sql } from '@life-as-code/db'
import { LIFECYCLE_STAGES, SearchInputSchema } from '@life-as-code/validators'
import type { SearchResultItem } from '@life-as-code/validators'

import { createTRPCRouter, publicProcedure } from '@/trpc'

const DEFAULT_ORG_ID = 'default'

const COMPLETION_RANGES: Record<string, [number, number]> = {
  none: [0, 0],
  partial: [1, 4],
  substantial: [5, 7],
  complete: [8, 9],
}

export const searchRouter = createTRPCRouter({
  fullText: publicProcedure
    .input(SearchInputSchema)
    .query(async ({ ctx, input }) => {
      const { query, filters, limit } = input
      const ilikePat = `%${query}%`
      const tsQuery = sql`plainto_tsquery('english', ${query})`

      // Optional status filter clause
      const statusClause = filters?.status ? sql`AND f.status = ${filters.status}` : sql``

      // Optional tags filter: JSONB containment check for any supplied tag
      let tagsClause = sql``
      if (filters?.tags && filters.tags.length > 0) {
        const tagConditions = filters.tags.map((tag) => sql`f.content @> ${JSON.stringify({ tags: [tag] })}::jsonb`)
        const combined = tagConditions.reduce((acc, cond) => sql`${acc} OR ${cond}`)
        tagsClause = sql`AND (${combined})`
      }

      const result = await ctx.db.execute(sql`
        SELECT
          f.id,
          f.feature_key,
          f.status,
          f.frozen,
          f.content,
          f.updated_at,
          ts_headline(
            'english',
            f.content::text,
            ${tsQuery},
            'MaxFragments=2,MaxWords=20,MinWords=5,StartSel=<mark>,StopSel=</mark>,HighlightAll=false'
          ) AS snippet,
          ts_rank(f.content_search, ${tsQuery}) AS rank,
          CASE
            WHEN f.feature_key = ${query} THEN 0
            WHEN f.content->'problem'->>'problemStatement' ILIKE ${ilikePat} THEN 1
            ELSE 2
          END AS priority
        FROM features f
        WHERE
          f.org_id = ${DEFAULT_ORG_ID}
          AND (f.content_search @@ ${tsQuery} OR f.feature_key ILIKE ${ilikePat})
          ${statusClause}
          ${tagsClause}
        ORDER BY priority ASC, rank DESC, f.updated_at DESC
        LIMIT ${limit}
      `)

      const rows = result.rows as Array<{
        id: string
        feature_key: string
        status: 'active' | 'draft' | 'frozen' | 'flagged'
        frozen: boolean
        content: Record<string, unknown>
        updated_at: string
        snippet: string
        rank: number
        priority: number
      }>

      const lowerQuery = query.toLowerCase()

      const mapped = rows.map((row) => {
        const content = (row.content ?? {}) as Record<string, Record<string, unknown>>
        const title = (content?.problem?.problemStatement as string | undefined) ?? 'Untitled'

        // Detect matched stage in application code by checking each stage's content text
        let matchedStage: (typeof LIFECYCLE_STAGES)[number] | null = null
        for (const stage of LIFECYCLE_STAGES) {
          const stageContent = content[stage]
          if (!stageContent) continue
          if (JSON.stringify(stageContent).toLowerCase().includes(lowerQuery)) {
            matchedStage = stage
            break
          }
        }

        return {
          id: row.id,
          featureKey: row.feature_key,
          title,
          status: row.status,
          frozen: row.frozen,
          matchedStage,
          snippet: row.snippet ?? '',
          updatedAt: new Date(row.updated_at),
        }
      })

      // Post-query filters: stage and completionLevel are derived from content, not DB columns
      return mapped.filter((item): item is SearchResultItem => {
        if (filters?.stage && item.matchedStage !== filters.stage) return false
        if (filters?.completionLevel) {
          const [min, max] = COMPLETION_RANGES[filters.completionLevel] ?? [0, 9]
          const rowContent = (rows.find((r) => r.id === item.id)?.content ?? {}) as Record<string, Record<string, unknown>>
          const completedCount = LIFECYCLE_STAGES.filter((stage) => {
            const s = rowContent[stage]
            return s && Object.values(s).some((v) => typeof v === 'string' && v.trim().length > 0)
          }).length
          if (completedCount < min || completedCount > max) return false
        }
        return true
      })
    }),
})

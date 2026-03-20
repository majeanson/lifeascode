import { z } from 'zod'

import { LIFECYCLE_STAGES } from './lifecycle'

export const SearchFilterSchema = z.object({
  stage: z.enum(LIFECYCLE_STAGES).optional(),
  tags: z.array(z.string()).optional(),
  status: z.enum(['active', 'draft', 'frozen', 'flagged']).optional(),
  completionLevel: z.enum(['none', 'partial', 'substantial', 'complete']).optional(),
})

export const SearchInputSchema = z.object({
  query: z.string().min(1).max(200),
  filters: SearchFilterSchema.optional(),
  limit: z.number().int().min(1).max(100).default(50),
})

export const SearchResultItemSchema = z.object({
  id: z.string(),
  featureKey: z.string(),
  title: z.string(),
  status: z.enum(['active', 'draft', 'frozen', 'flagged']),
  frozen: z.boolean(),
  matchedStage: z.enum(LIFECYCLE_STAGES).nullable(),
  snippet: z.string(),
  updatedAt: z.date(),
})

export type SearchInput = z.infer<typeof SearchInputSchema>
export type SearchFilter = z.infer<typeof SearchFilterSchema>
export type SearchResultItem = z.infer<typeof SearchResultItemSchema>

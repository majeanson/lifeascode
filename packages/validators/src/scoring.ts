import { z } from 'zod'

export const SetScoreSchema = z.object({
  featureId: z.string().min(1),
  score: z.number().int().min(0).max(10).nullable(),
})

export const SetTargetPeriodSchema = z.object({
  featureId: z.string().min(1),
  targetPeriod: z.string().min(1).max(20).nullable(),
})

export const SetPrioritySchema = z.object({
  featureId: z.string().min(1),
  priority: z.number().int().min(1).max(5).nullable(),
})

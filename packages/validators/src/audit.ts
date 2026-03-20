import { z } from 'zod'

export const ListFeatureEventsSchema = z.object({
  id: z.string().min(1),
  cursor: z.number().int().min(0).default(0),
})

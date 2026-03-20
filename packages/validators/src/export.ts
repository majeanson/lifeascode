import { z } from 'zod'

export const ExportAllSchema = z.object({
  status: z.enum(['active', 'draft', 'frozen', 'flagged']).optional(),
  tags: z.array(z.string()).optional(),
})

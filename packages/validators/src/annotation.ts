import { z } from 'zod'

export const AnnotationEntrySchema = z.object({
  id: z.string(),
  text: z.string(),
  actor: z.string(),
  timestamp: z.string(),
  flagged: z.boolean(),
})

export type AnnotationEntry = z.infer<typeof AnnotationEntrySchema>

export const AddAnnotationSchema = z.object({
  featureId: z.string().min(1),
  text: z.string().min(1).max(5000),
})

export const ListAnnotationsSchema = z.object({
  id: z.string().min(1),
})

export const FlagAnnotationSchema = z.object({
  featureId: z.string().min(1),
  annotationId: z.string().min(1),
  flagged: z.boolean(),
})

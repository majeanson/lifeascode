import { z } from 'zod'

import { FeatureContentSchema } from './feature'

export const ListTemplatesSchema = z.object({})

export const CreateTemplateSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  content: FeatureContentSchema.default({}),
})

export const UpdateTemplateSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  content: FeatureContentSchema.optional(),
})

export const CloneTemplateSchema = z.object({
  id: z.string().min(1),
})

export const DeleteTemplateSchema = z.object({
  id: z.string().min(1),
})

export type ListTemplatesInput = z.infer<typeof ListTemplatesSchema>
export type CreateTemplateInput = z.infer<typeof CreateTemplateSchema>
export type UpdateTemplateInput = z.infer<typeof UpdateTemplateSchema>
export type CloneTemplateInput = z.infer<typeof CloneTemplateSchema>
export type DeleteTemplateInput = z.infer<typeof DeleteTemplateSchema>

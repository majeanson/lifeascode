import { z } from 'zod'

import { LIFECYCLE_STAGES } from './lifecycle'

// Mirrors StatusTransitionSchema in @life-as-code/feature-schema (lac-cli side).
// Kept as a local type — the two ecosystems are schema-independent.
export const StatusHistoryEntrySchema = z.object({
  from: z.string(),
  to: z.string(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  reason: z.string().optional(),
})

export const FeatureContentSchema = z
  .object({
    title: z.string().max(200).optional(),
    problem: z
      .object({
        problemStatement: z.string().optional(),
        reporterContext: z.string().optional(),
      })
      .passthrough()
      .optional(),
    analysis: z.record(z.string(), z.unknown()).optional(),
    requirements: z.record(z.string(), z.unknown()).optional(),
    design: z.record(z.string(), z.unknown()).optional(),
    implementation: z.record(z.string(), z.unknown()).optional(),
    validation: z.record(z.string(), z.unknown()).optional(),
    documentation: z.record(z.string(), z.unknown()).optional(),
    delivery: z.record(z.string(), z.unknown()).optional(),
    support: z.record(z.string(), z.unknown()).optional(),
    tags: z.array(z.string()).optional(),
    spawn: z
      .object({ spawnReason: z.string().optional() })
      .passthrough()
      .optional(),
    // Written by lac-mcp advance_feature on every status transition.
    // Parallel to the feature_events audit log — this version travels with the feature.json.
    statusHistory: z.array(StatusHistoryEntrySchema).optional(),
    // Lifecycle pointers (added 2026-03-21 in lac-cli; sync kept explicit for ingestion)
    revisions: z.array(z.object({
      date: z.string(),
      author: z.string(),
      fields_changed: z.array(z.string()),
      reason: z.string(),
    })).optional(),
    superseded_by: z.string().optional(),
    superseded_from: z.array(z.string()).optional(),
    merged_into: z.string().optional(),
    merged_from: z.array(z.string()).optional(),
    // Reconstruction-critical fields (added 2026-03-22 in lac-cli)
    componentFile: z.string().optional(),
    npmPackages: z.array(z.string()).optional(),
    publicInterface: z.array(z.object({ name: z.string(), type: z.string(), description: z.string().optional() })).optional(),
    externalDependencies: z.array(z.string()).optional(),
    lastVerifiedDate: z.string().optional(),
    codeSnippets: z.array(z.object({ label: z.string(), snippet: z.string() })).optional(),
  })
  .passthrough()

export const CreateFeatureSchema = z.object({
  problemStatement: z.string(),
  reporterContext: z.string().optional(),
  templateContent: FeatureContentSchema.optional(),
})

export const UpdateStageSchema = z.object({
  featureId: z.string().min(1),
  stage: z.enum(LIFECYCLE_STAGES),
  stageContent: z.record(z.string(), z.unknown()),
})

export const GetFeatureSchema = z.object({
  id: z.string(),
})

export const DecisionEntrySchema = z.object({
  what: z.string().min(1),
  why: z.string().min(1),
  alternatives: z.string().optional(),
})

export const AddDecisionSchema = z.object({
  featureId: z.string().min(1),
  stage: z.enum(LIFECYCLE_STAGES),
  entry: DecisionEntrySchema,
})

export const UpdateTagsSchema = z.object({
  featureId: z.string().min(1),
  tags: z.array(z.string().min(1).max(50)).max(10),
})

export const UpdateTitleSchema = z.object({
  featureId: z.string().min(1),
  title: z.string().max(200),
})

export const FreezeFeatureSchema = z.object({
  id: z.string().min(1),
})

export const SpawnFeatureSchema = z.object({
  parentId: z.string().min(1),
  spawnReason: z.string().min(1, 'Spawn reason is required'),
})

export const GetLineageSchema = z.object({
  id: z.string().min(1),
})

export const GetFeatureJsonSchema = z.object({
  id: z.string().min(1),
})

export const UpdateFeatureJsonSchema = z.object({
  id: z.string().min(1),
  jsonContent: z.string().min(1),
})

export const GetFeatureByKeySchema = z.object({
  featureKey: z.string().min(1),
})

export type GetFeatureByKeyInput = z.infer<typeof GetFeatureByKeySchema>
export type CreateFeatureInput = z.infer<typeof CreateFeatureSchema>
export type UpdateStageInput = z.infer<typeof UpdateStageSchema>
export type GetFeatureInput = z.infer<typeof GetFeatureSchema>
export type DecisionEntry = z.infer<typeof DecisionEntrySchema> & { id: string; createdAt: string; actor: string }
export type AddDecisionInput = z.infer<typeof AddDecisionSchema>
export type UpdateTagsInput = z.infer<typeof UpdateTagsSchema>
export type UpdateTitleInput = z.infer<typeof UpdateTitleSchema>
export type FreezeFeatureInput = z.infer<typeof FreezeFeatureSchema>
export type SpawnFeatureInput = z.infer<typeof SpawnFeatureSchema>
export type GetLineageInput = z.infer<typeof GetLineageSchema>
export type GetFeatureJsonInput = z.infer<typeof GetFeatureJsonSchema>
export type UpdateFeatureJsonInput = z.infer<typeof UpdateFeatureJsonSchema>
export type StatusHistoryEntry = z.infer<typeof StatusHistoryEntrySchema>
export type FeatureContent = z.infer<typeof FeatureContentSchema>

export const ListFeaturesPagedSchema = z.object({
  limit: z.number().int().min(1).max(100).default(25),
  cursor: z.number().int().min(0).default(0),
  status: z.enum(['all', 'active', 'draft', 'frozen', 'flagged']).optional(),
  search: z.string().optional(),
  /** Server-side completeness filter — avoids client-side filtering on a single page */
  completenessLevel: z.enum(['needs', 'partial', 'complete']).optional(),
})

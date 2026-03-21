import { z } from 'zod'

export const ConnectGithubSourceSchema = z.object({
  owner: z.string().min(1),
  repo: z.string().min(1),
  branch: z.string().min(1).default('main'),
  pat: z.string().min(1),
})

export const DisconnectGithubSourceSchema = z.object({
  id: z.string().min(1),
})

export const SyncGithubSourceSchema = z.object({
  id: z.string().min(1),
})

export const ListGithubSourcesSchema = z.object({}).optional()

/** Shape of a feature.json file on disk / in GitHub */
export const GithubFeatureFileSchema = z.object({
  featureKey: z.string().min(1),
  title: z.string().optional(),
  status: z.enum(['active', 'draft', 'frozen', 'flagged']).optional(),
  problem: z.record(z.string(), z.unknown()).optional(),
  analysis: z.record(z.string(), z.unknown()).optional(),
  requirements: z.record(z.string(), z.unknown()).optional(),
  design: z.record(z.string(), z.unknown()).optional(),
  implementation: z.record(z.string(), z.unknown()).optional(),
  validation: z.record(z.string(), z.unknown()).optional(),
  documentation: z.record(z.string(), z.unknown()).optional(),
  delivery: z.record(z.string(), z.unknown()).optional(),
  support: z.record(z.string(), z.unknown()).optional(),
  tags: z.array(z.string()).optional(),
  successCriteria: z.string().optional(),
  domain: z.string().optional(),
}).passthrough()

export type GithubFeatureFile = z.infer<typeof GithubFeatureFileSchema>

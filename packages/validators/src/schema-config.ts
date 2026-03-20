import { z } from 'zod'

import { LIFECYCLE_STAGES } from './lifecycle'

export const FieldTypeSchema = z.enum(['text', 'textarea', 'tags', 'decision-log', 'jira-link'])

export const SchemaFieldSchema = z.object({
  name: z.string().min(1),
  stage: z.enum([...LIFECYCLE_STAGES, 'all'] as const),
  type: FieldTypeSchema,
  enabled: z.boolean().default(true),
})

export const CustomFieldSchema = SchemaFieldSchema.extend({
  description: z.string().optional(),
})

export const SchemaConfigContentSchema = z.object({
  requiredFields: z.array(SchemaFieldSchema),
  standardFields: z.array(SchemaFieldSchema),
  customFields: z.array(CustomFieldSchema),
})

export const GetActiveSchemaSchema = z.object({})
export const UpdateSchemaSchema = z.object({
  config: SchemaConfigContentSchema,
})

export type FieldType = z.infer<typeof FieldTypeSchema>
export type SchemaField = z.infer<typeof SchemaFieldSchema>
export type CustomField = z.infer<typeof CustomFieldSchema>
export type SchemaConfigContent = z.infer<typeof SchemaConfigContentSchema>
export type GetActiveSchemaInput = z.infer<typeof GetActiveSchemaSchema>
export type UpdateSchemaInput = z.infer<typeof UpdateSchemaSchema>

export const DEFAULT_SCHEMA_CONFIG: SchemaConfigContent = {
  requiredFields: [
    { name: 'problemStatement', stage: 'problem', type: 'textarea', enabled: true },
    { name: 'acceptanceCriteria', stage: 'requirements', type: 'textarea', enabled: true },
    { name: 'implementationRefs', stage: 'implementation', type: 'text', enabled: true },
  ],
  standardFields: [
    { name: 'reporterContext', stage: 'problem', type: 'textarea', enabled: true },
    { name: 'edgeCases', stage: 'analysis', type: 'textarea', enabled: true },
    { name: 'designDecisions', stage: 'design', type: 'decision-log', enabled: true },
  ],
  customFields: [],
}

// ---- Schema profiles ----

export type SchemaProfileKey = 'basic' | 'jira' | 'full' | 'custom'

export interface SchemaProfile {
  key: SchemaProfileKey
  label: string
  description: string
  config: SchemaConfigContent | null // null = custom (no preset)
}

const JIRA_FIELDS: SchemaConfigContent['customFields'] = [
  {
    name: 'jiraIssueKey',
    stage: 'implementation',
    type: 'jira-link',
    enabled: true,
    description: 'Linked Jira issue (e.g. PROJ-123)',
  },
  {
    name: 'jiraEpicKey',
    stage: 'requirements',
    type: 'jira-link',
    enabled: true,
    description: 'Parent Jira epic (e.g. PROJ-42)',
  },
  {
    name: 'confluencePageUrl',
    stage: 'documentation',
    type: 'jira-link',
    enabled: true,
    description: 'Confluence spec page URL',
  },
  {
    name: 'jiraFixVersion',
    stage: 'delivery',
    type: 'text',
    enabled: true,
    description: 'Jira fix version / release target (e.g. v2.4.0)',
  },
  {
    name: 'jiraComponents',
    stage: 'implementation',
    type: 'tags',
    enabled: true,
    description: 'Jira component labels for this feature',
  },
]

export const SCHEMA_PROFILES: SchemaProfile[] = [
  {
    key: 'basic',
    label: 'Basic',
    description: 'Core provenance fields only — problem, criteria, and implementation refs.',
    config: {
      requiredFields: DEFAULT_SCHEMA_CONFIG.requiredFields,
      standardFields: [],
      customFields: [],
    },
  },
  {
    key: 'jira',
    label: 'Jira',
    description: 'Standard fields plus Jira issue keys, epic links, Confluence URLs, and fix versions.',
    config: {
      requiredFields: DEFAULT_SCHEMA_CONFIG.requiredFields,
      standardFields: DEFAULT_SCHEMA_CONFIG.standardFields,
      customFields: JIRA_FIELDS,
    },
  },
  {
    key: 'full',
    label: 'Full',
    description: 'Everything: all standard fields, Jira integration, stakeholder tracking, and support runbook.',
    config: {
      requiredFields: DEFAULT_SCHEMA_CONFIG.requiredFields,
      standardFields: DEFAULT_SCHEMA_CONFIG.standardFields,
      customFields: [
        ...JIRA_FIELDS,
        {
          name: 'businessOwner',
          stage: 'problem',
          type: 'text',
          enabled: true,
          description: 'Business stakeholder responsible for this feature',
        },
        {
          name: 'successMetrics',
          stage: 'validation',
          type: 'textarea',
          enabled: true,
          description: 'KPIs or measurable criteria that define success',
        },
        {
          name: 'rollbackPlan',
          stage: 'delivery',
          type: 'textarea',
          enabled: true,
          description: 'Steps to revert this deployment if something goes wrong',
        },
        {
          name: 'supportRunbook',
          stage: 'support',
          type: 'textarea',
          enabled: true,
          description: 'On-call runbook: symptoms, diagnosis steps, resolution',
        },
      ],
    },
  },
  {
    key: 'custom',
    label: 'Custom',
    description: 'Manually configure every field. Activates automatically when you edit the schema.',
    config: null,
  },
]

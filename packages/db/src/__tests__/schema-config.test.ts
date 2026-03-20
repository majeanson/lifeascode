import { describe, expect, it } from 'vitest'

import { DEFAULT_SCHEMA_CONFIG, SchemaConfigContentSchema } from '@life-as-code/validators'

describe('SchemaConfigContentSchema', () => {
  it('validates a valid three-layer config without errors', () => {
    const valid = {
      requiredFields: [{ name: 'problemStatement', stage: 'problem', type: 'textarea', enabled: true }],
      standardFields: [{ name: 'edgeCases', stage: 'analysis', type: 'textarea', enabled: true }],
      customFields: [{ name: 'myField', stage: 'all', type: 'text', enabled: true, description: 'A custom field' }],
    }
    expect(SchemaConfigContentSchema.safeParse(valid).success).toBe(true)
  })

  it('rejects invalid field type (not in enum)', () => {
    const bad = {
      requiredFields: [{ name: 'problemStatement', stage: 'problem', type: 'invalid-type', enabled: true }],
      standardFields: [],
      customFields: [],
    }
    expect(SchemaConfigContentSchema.safeParse(bad).success).toBe(false)
  })

  it('rejects missing requiredFields array', () => {
    const bad = { standardFields: [], customFields: [] }
    expect(SchemaConfigContentSchema.safeParse(bad).success).toBe(false)
  })

  it('validates DEFAULT_SCHEMA_CONFIG passes SchemaConfigContentSchema', () => {
    expect(SchemaConfigContentSchema.safeParse(DEFAULT_SCHEMA_CONFIG).success).toBe(true)
  })
})

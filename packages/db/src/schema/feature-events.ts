import { index, jsonb, pgEnum, pgTable, text, timestamp } from 'drizzle-orm/pg-core'

export const eventTypeEnum = pgEnum('event_type', [
  'FEATURE_CREATED',
  'FEATURE_UPDATED',
  'FEATURE_FROZEN',
  'FEATURE_SPAWNED',
  'STAGE_UPDATED',
  'ANNOTATION_ADDED',
  'SCHEMA_UPDATED',
])

export const featureEvents = pgTable(
  'feature_events',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    featureId: text('feature_id').notNull(),
    orgId: text('org_id').notNull(),
    eventType: eventTypeEnum('event_type').notNull(),
    changedFields: jsonb('changed_fields').notNull().default({}),
    actor: text('actor').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [
    index('idx_feature_events_feature_id').on(table.featureId),
    index('idx_feature_events_org_id').on(table.orgId),
  ],
)

export type FeatureEvent = typeof featureEvents.$inferSelect
export type NewFeatureEvent = typeof featureEvents.$inferInsert

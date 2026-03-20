import { jsonb, pgTable, text, timestamp } from 'drizzle-orm/pg-core'
import { ulid } from 'ulidx'

export const featureTemplates = pgTable('feature_templates', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => ulid()),
  orgId: text('org_id').notNull(),
  name: text('name').notNull(),
  description: text('description'),
  content: jsonb('content').notNull().default({}),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export type FeatureTemplate = typeof featureTemplates.$inferSelect
export type NewFeatureTemplate = typeof featureTemplates.$inferInsert

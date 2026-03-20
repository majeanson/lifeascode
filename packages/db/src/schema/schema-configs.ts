import { jsonb, pgTable, text, timestamp } from 'drizzle-orm/pg-core'

export const schemaConfigs = pgTable('schema_configs', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  orgId: text('org_id').notNull(),
  config: jsonb('config').notNull().default({}),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export type SchemaConfig = typeof schemaConfigs.$inferSelect
export type NewSchemaConfig = typeof schemaConfigs.$inferInsert

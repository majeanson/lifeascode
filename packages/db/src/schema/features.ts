import { boolean, index, integer, jsonb, pgEnum, pgTable, smallint, text, timestamp } from 'drizzle-orm/pg-core'
import { ulid } from 'ulidx'

export const statusEnum = pgEnum('status', ['active', 'draft', 'frozen', 'flagged'])

export const features = pgTable(
  'features',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => ulid()),
    featureKey: text('feature_key').notNull().unique(),
    orgId: text('org_id').notNull(),
    status: statusEnum('status').notNull().default('draft'),
    frozen: boolean('frozen').notNull().default(false),
    parentId: text('parent_id'),
    content: jsonb('content').notNull().default({}),
    score: smallint('score'),
    priority: smallint('priority'),
    targetPeriod: text('target_period'),
    /** Pre-computed completeness 0-100 based on filled lifecycle stages. Updated on every content write. */
    completeness_pct: integer('completeness_pct').notNull().default(0),
    /** GitHub sync — null means DB-native, set means synced from a repo */
    githubSourceId: text('github_source_id'),
    githubPath: text('github_path'),
    githubSha: text('github_sha'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [
    index('idx_features_org_id').on(table.orgId),
    index('idx_features_feature_key').on(table.featureKey),
    index('idx_features_parent_id').on(table.parentId),
    index('idx_features_priority').on(table.priority),
  ],
)

export type Feature = typeof features.$inferSelect
export type NewFeature = typeof features.$inferInsert

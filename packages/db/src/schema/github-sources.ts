import { index, pgEnum, pgTable, text, timestamp } from 'drizzle-orm/pg-core'

export const githubSyncStatusEnum = pgEnum('github_sync_status', [
  'idle',
  'syncing',
  'error',
])

export const githubSources = pgTable(
  'github_sources',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    orgId: text('org_id').notNull(),
    /** GitHub owner — user or org */
    owner: text('owner').notNull(),
    repo: text('repo').notNull(),
    branch: text('branch').notNull().default('main'),
    /** Personal access token — stored plain, single-tenant app */
    pat: text('pat').notNull(),
    syncStatus: githubSyncStatusEnum('sync_status').notNull().default('idle'),
    lastSyncedAt: timestamp('last_synced_at'),
    lastError: text('last_error'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [
    index('idx_github_sources_org_id').on(table.orgId),
  ],
)

export type GithubSource = typeof githubSources.$inferSelect
export type NewGithubSource = typeof githubSources.$inferInsert

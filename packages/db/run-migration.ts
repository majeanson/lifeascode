/**
 * One-off script: apply 0005 migration directly, bypassing drizzle-kit push bugs.
 * Run: bun run-migration.ts
 */
import postgres from 'postgres'

const url = process.env.DATABASE_URL
if (!url) throw new Error('DATABASE_URL not set')

const sql = postgres(url, { prepare: false })

const migration = `
DO $$ BEGIN
  CREATE TYPE "public"."github_sync_status" AS ENUM('idle', 'syncing', 'error');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "github_sources" (
  "id" text PRIMARY KEY NOT NULL,
  "org_id" text NOT NULL,
  "owner" text NOT NULL,
  "repo" text NOT NULL,
  "branch" text DEFAULT 'main' NOT NULL,
  "pat" text NOT NULL,
  "sync_status" "github_sync_status" DEFAULT 'idle' NOT NULL,
  "last_synced_at" timestamp,
  "last_error" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_github_sources_org_id" ON "github_sources" USING btree ("org_id");

ALTER TABLE "features" ADD COLUMN IF NOT EXISTS "github_source_id" text;
ALTER TABLE "features" ADD COLUMN IF NOT EXISTS "github_path" text;
ALTER TABLE "features" ADD COLUMN IF NOT EXISTS "github_sha" text;
`

try {
  await sql.unsafe(migration)
  console.log('✓ Migration 0005 applied successfully')
} catch (err) {
  console.error('✗ Migration failed:', err)
  process.exit(1)
} finally {
  await sql.end()
}

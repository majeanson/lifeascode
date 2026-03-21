CREATE TYPE "public"."github_sync_status" AS ENUM('idle', 'syncing', 'error');--> statement-breakpoint
CREATE TABLE "github_sources" (
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
--> statement-breakpoint
ALTER TABLE "features" ADD COLUMN "github_source_id" text;--> statement-breakpoint
ALTER TABLE "features" ADD COLUMN "github_path" text;--> statement-breakpoint
ALTER TABLE "features" ADD COLUMN "github_sha" text;--> statement-breakpoint
CREATE INDEX "idx_github_sources_org_id" ON "github_sources" USING btree ("org_id");
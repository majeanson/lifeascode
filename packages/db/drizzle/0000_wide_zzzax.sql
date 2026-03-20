CREATE TYPE "public"."event_type" AS ENUM('FEATURE_CREATED', 'FEATURE_UPDATED', 'FEATURE_FROZEN', 'FEATURE_SPAWNED', 'STAGE_UPDATED', 'ANNOTATION_ADDED', 'SCHEMA_UPDATED');--> statement-breakpoint
CREATE TYPE "public"."status" AS ENUM('active', 'draft', 'frozen');--> statement-breakpoint
CREATE TABLE "account" (
	"userId" text NOT NULL,
	"type" text NOT NULL,
	"provider" text NOT NULL,
	"providerAccountId" text NOT NULL,
	"refresh_token" text,
	"access_token" text,
	"expires_at" integer,
	"token_type" text,
	"scope" text,
	"id_token" text,
	"session_state" text
);
--> statement-breakpoint
CREATE TABLE "authenticator" (
	"credentialID" text NOT NULL,
	"userId" text NOT NULL,
	"providerAccountId" text NOT NULL,
	"credentialPublicKey" text NOT NULL,
	"counter" integer NOT NULL,
	"credentialDeviceType" text NOT NULL,
	"credentialBackedUp" boolean NOT NULL,
	"transports" text,
	CONSTRAINT "authenticator_credentialID_unique" UNIQUE("credentialID")
);
--> statement-breakpoint
CREATE TABLE "session" (
	"sessionToken" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"expires" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text,
	"email" text,
	"emailVerified" timestamp,
	"image" text,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verificationToken" (
	"identifier" text NOT NULL,
	"token" text NOT NULL,
	"expires" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "feature_events" (
	"id" text PRIMARY KEY NOT NULL,
	"feature_id" text NOT NULL,
	"org_id" text NOT NULL,
	"event_type" "event_type" NOT NULL,
	"changed_fields" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"actor" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "features" (
	"id" text PRIMARY KEY NOT NULL,
	"feature_key" text NOT NULL,
	"org_id" text NOT NULL,
	"status" "status" DEFAULT 'draft' NOT NULL,
	"frozen" boolean DEFAULT false NOT NULL,
	"parent_id" text,
	"content" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "features_feature_key_unique" UNIQUE("feature_key")
);
--> statement-breakpoint
CREATE TABLE "schema_configs" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "authenticator" ADD CONSTRAINT "authenticator_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_feature_events_feature_id" ON "feature_events" USING btree ("feature_id");--> statement-breakpoint
CREATE INDEX "idx_feature_events_org_id" ON "feature_events" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "idx_features_org_id" ON "features" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "idx_features_feature_key" ON "features" USING btree ("feature_key");--> statement-breakpoint
-- Enable pg_trgm extension for fuzzy/partial text search (AC: #4)
CREATE EXTENSION IF NOT EXISTS pg_trgm;
--> statement-breakpoint
-- Add tsvector generated column for full-text search across JSONB content (AC: #4)
ALTER TABLE "features" ADD COLUMN "content_search" tsvector GENERATED ALWAYS AS (to_tsvector('english', coalesce(content::text, ''))) STORED;
--> statement-breakpoint
-- GIN index on tsvector column (AC: #4)
CREATE INDEX "idx_features_fts" ON "features" USING gin ("content_search");
--> statement-breakpoint
-- pg_trgm GIN index on feature_key for partial/fuzzy match (AC: #4)
CREATE INDEX "idx_features_trgm" ON "features" USING gin ("feature_key" gin_trgm_ops);
--> statement-breakpoint
-- Immutability trigger: blocks UPDATE/DELETE on frozen features (AC: #3, NFR7)
CREATE OR REPLACE FUNCTION prevent_frozen_feature_mutation()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.frozen = true THEN
    RAISE EXCEPTION 'Cannot modify a frozen feature (id: %)', OLD.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER enforce_feature_immutability
  BEFORE UPDATE OR DELETE ON features
  FOR EACH ROW
  EXECUTE FUNCTION prevent_frozen_feature_mutation();

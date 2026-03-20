ALTER TABLE "features" ADD COLUMN "completeness_pct" integer NOT NULL DEFAULT 0;--> statement-breakpoint
CREATE INDEX "idx_features_completeness_pct" ON "features" ("completeness_pct");--> statement-breakpoint
CREATE INDEX "idx_features_parent_id" ON "features" ("parent_id");

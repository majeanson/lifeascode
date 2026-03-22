ALTER TABLE "features" ADD COLUMN "priority" smallint;--> statement-breakpoint
CREATE INDEX "idx_features_priority" ON "features" USING btree ("priority");
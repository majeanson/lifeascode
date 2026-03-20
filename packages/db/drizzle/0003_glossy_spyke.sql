ALTER TABLE "features" ADD COLUMN "score" smallint;--> statement-breakpoint
ALTER TABLE "features" ADD COLUMN "target_period" text;--> statement-breakpoint
ALTER TABLE "features" ADD CONSTRAINT score_range CHECK (score IS NULL OR (score >= 0 AND score <= 10));
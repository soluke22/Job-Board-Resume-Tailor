ALTER TABLE "candidate_profiles" ADD COLUMN "name" text;--> statement-breakpoint
ALTER TABLE "candidate_profiles" ADD COLUMN "email" text;--> statement-breakpoint
ALTER TABLE "candidate_profiles" ADD COLUMN "phone" text;--> statement-breakpoint
ALTER TABLE "candidate_profiles" ADD COLUMN "location" text;--> statement-breakpoint
ALTER TABLE "candidate_profiles" ADD COLUMN "title" text;--> statement-breakpoint
ALTER TABLE "candidate_profiles" ADD COLUMN "master_summary" text;--> statement-breakpoint
ALTER TABLE "evidence_items" ADD COLUMN "raw_evidence" text;--> statement-breakpoint
ALTER TABLE "evidence_items" ADD COLUMN "source_type" text;--> statement-breakpoint
ALTER TABLE "evidence_items" ADD COLUMN "source_location" text;--> statement-breakpoint
ALTER TABLE "evidence_items" ADD COLUMN "verification_status" text;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "title" text;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "company" text;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "canonical_url" text;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "ats_provider" text;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "ats_job_id" text;
CREATE TABLE "auth_account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "application_events" (
	"owner_id" text NOT NULL,
	"id" text NOT NULL,
	"parent_id" text,
	"label" text,
	"status" text,
	"data" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "application_events_owner_id_id_pk" PRIMARY KEY("owner_id","id")
);
--> statement-breakpoint
CREATE TABLE "applications" (
	"owner_id" text NOT NULL,
	"id" text NOT NULL,
	"parent_id" text,
	"label" text,
	"status" text,
	"data" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "applications_owner_id_id_pk" PRIMARY KEY("owner_id","id")
);
--> statement-breakpoint
CREATE TABLE "audit_events" (
	"owner_id" text NOT NULL,
	"id" text NOT NULL,
	"parent_id" text,
	"label" text,
	"status" text,
	"data" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "audit_events_owner_id_id_pk" PRIMARY KEY("owner_id","id")
);
--> statement-breakpoint
CREATE TABLE "candidate_profiles" (
	"owner_id" text NOT NULL,
	"id" text NOT NULL,
	"parent_id" text,
	"label" text,
	"status" text,
	"data" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "candidate_profiles_owner_id_id_pk" PRIMARY KEY("owner_id","id")
);
--> statement-breakpoint
CREATE TABLE "contacts" (
	"owner_id" text NOT NULL,
	"id" text NOT NULL,
	"parent_id" text,
	"label" text,
	"status" text,
	"data" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "contacts_owner_id_id_pk" PRIMARY KEY("owner_id","id")
);
--> statement-breakpoint
CREATE TABLE "evidence_items" (
	"owner_id" text NOT NULL,
	"id" text NOT NULL,
	"parent_id" text,
	"label" text,
	"status" text,
	"data" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "evidence_items_owner_id_id_pk" PRIMARY KEY("owner_id","id")
);
--> statement-breakpoint
CREATE TABLE "experiences" (
	"owner_id" text NOT NULL,
	"id" text NOT NULL,
	"parent_id" text,
	"label" text,
	"status" text,
	"data" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "experiences_owner_id_id_pk" PRIMARY KEY("owner_id","id")
);
--> statement-breakpoint
CREATE TABLE "fit_assessments" (
	"owner_id" text NOT NULL,
	"id" text NOT NULL,
	"parent_id" text,
	"label" text,
	"status" text,
	"data" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "fit_assessments_owner_id_id_pk" PRIMARY KEY("owner_id","id")
);
--> statement-breakpoint
CREATE TABLE "jobs" (
	"owner_id" text NOT NULL,
	"id" text NOT NULL,
	"parent_id" text,
	"label" text,
	"status" text,
	"data" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "jobs_owner_id_id_pk" PRIMARY KEY("owner_id","id")
);
--> statement-breakpoint
CREATE TABLE "outreach_records" (
	"owner_id" text NOT NULL,
	"id" text NOT NULL,
	"parent_id" text,
	"label" text,
	"status" text,
	"data" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "outreach_records_owner_id_id_pk" PRIMARY KEY("owner_id","id")
);
--> statement-breakpoint
CREATE TABLE "private_files" (
	"owner_id" text NOT NULL,
	"id" text NOT NULL,
	"blob_path" text NOT NULL,
	"original_filename" text NOT NULL,
	"mime_type" text NOT NULL,
	"size" integer NOT NULL,
	"purpose" text NOT NULL,
	"source_type" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "private_files_owner_id_id_pk" PRIMARY KEY("owner_id","id"),
	CONSTRAINT "private_files_blob_path_unique" UNIQUE("blob_path")
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"owner_id" text NOT NULL,
	"id" text NOT NULL,
	"parent_id" text,
	"label" text,
	"status" text,
	"data" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "projects_owner_id_id_pk" PRIMARY KEY("owner_id","id")
);
--> statement-breakpoint
CREATE TABLE "proof_records" (
	"owner_id" text NOT NULL,
	"id" text NOT NULL,
	"parent_id" text,
	"label" text,
	"status" text,
	"data" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "proof_records_owner_id_id_pk" PRIMARY KEY("owner_id","id")
);
--> statement-breakpoint
CREATE TABLE "resume_versions" (
	"owner_id" text NOT NULL,
	"id" text NOT NULL,
	"parent_id" text,
	"label" text,
	"status" text,
	"data" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "resume_versions_owner_id_id_pk" PRIMARY KEY("owner_id","id")
);
--> statement-breakpoint
CREATE TABLE "resumes" (
	"owner_id" text NOT NULL,
	"id" text NOT NULL,
	"parent_id" text,
	"label" text,
	"status" text,
	"data" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "resumes_owner_id_id_pk" PRIMARY KEY("owner_id","id")
);
--> statement-breakpoint
CREATE TABLE "search_profiles" (
	"owner_id" text NOT NULL,
	"id" text NOT NULL,
	"parent_id" text,
	"label" text,
	"status" text,
	"data" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "search_profiles_owner_id_id_pk" PRIMARY KEY("owner_id","id")
);
--> statement-breakpoint
CREATE TABLE "search_sessions" (
	"owner_id" text NOT NULL,
	"id" text NOT NULL,
	"parent_id" text,
	"label" text,
	"status" text,
	"data" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "search_sessions_owner_id_id_pk" PRIMARY KEY("owner_id","id")
);
--> statement-breakpoint
CREATE TABLE "auth_session" (
	"id" text PRIMARY KEY NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"user_id" text NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "auth_session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "skill_evidence" (
	"owner_id" text NOT NULL,
	"id" text NOT NULL,
	"parent_id" text,
	"label" text,
	"status" text,
	"data" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "skill_evidence_owner_id_id_pk" PRIMARY KEY("owner_id","id")
);
--> statement-breakpoint
CREATE TABLE "tailoring_plans" (
	"owner_id" text NOT NULL,
	"id" text NOT NULL,
	"parent_id" text,
	"label" text,
	"status" text,
	"data" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tailoring_plans_owner_id_id_pk" PRIMARY KEY("owner_id","id")
);
--> statement-breakpoint
CREATE TABLE "auth_user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "auth_user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "auth_verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workspaces" (
	"owner_id" text PRIMARY KEY NOT NULL,
	"revision" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "auth_account" ADD CONSTRAINT "auth_account_user_id_auth_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "application_events" ADD CONSTRAINT "application_events_owner_id_workspaces_owner_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."workspaces"("owner_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_owner_id_workspaces_owner_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."workspaces"("owner_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_owner_id_workspaces_owner_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."workspaces"("owner_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "candidate_profiles" ADD CONSTRAINT "candidate_profiles_owner_id_workspaces_owner_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."workspaces"("owner_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_owner_id_workspaces_owner_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."workspaces"("owner_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence_items" ADD CONSTRAINT "evidence_items_owner_id_workspaces_owner_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."workspaces"("owner_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "experiences" ADD CONSTRAINT "experiences_owner_id_workspaces_owner_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."workspaces"("owner_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fit_assessments" ADD CONSTRAINT "fit_assessments_owner_id_workspaces_owner_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."workspaces"("owner_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_owner_id_workspaces_owner_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."workspaces"("owner_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outreach_records" ADD CONSTRAINT "outreach_records_owner_id_workspaces_owner_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."workspaces"("owner_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "private_files" ADD CONSTRAINT "private_files_owner_id_auth_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."auth_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_owner_id_workspaces_owner_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."workspaces"("owner_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proof_records" ADD CONSTRAINT "proof_records_owner_id_workspaces_owner_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."workspaces"("owner_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resume_versions" ADD CONSTRAINT "resume_versions_owner_id_workspaces_owner_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."workspaces"("owner_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resumes" ADD CONSTRAINT "resumes_owner_id_workspaces_owner_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."workspaces"("owner_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "search_profiles" ADD CONSTRAINT "search_profiles_owner_id_workspaces_owner_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."workspaces"("owner_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "search_sessions" ADD CONSTRAINT "search_sessions_owner_id_workspaces_owner_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."workspaces"("owner_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_session" ADD CONSTRAINT "auth_session_user_id_auth_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "skill_evidence" ADD CONSTRAINT "skill_evidence_owner_id_workspaces_owner_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."workspaces"("owner_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tailoring_plans" ADD CONSTRAINT "tailoring_plans_owner_id_workspaces_owner_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."workspaces"("owner_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspaces" ADD CONSTRAINT "workspaces_owner_id_auth_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."auth_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_user_idx" ON "auth_account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "application_events_owner_parent_idx" ON "application_events" USING btree ("owner_id","parent_id");--> statement-breakpoint
CREATE INDEX "applications_owner_parent_idx" ON "applications" USING btree ("owner_id","parent_id");--> statement-breakpoint
CREATE INDEX "audit_events_owner_parent_idx" ON "audit_events" USING btree ("owner_id","parent_id");--> statement-breakpoint
CREATE INDEX "candidate_profiles_owner_parent_idx" ON "candidate_profiles" USING btree ("owner_id","parent_id");--> statement-breakpoint
CREATE INDEX "contacts_owner_parent_idx" ON "contacts" USING btree ("owner_id","parent_id");--> statement-breakpoint
CREATE INDEX "evidence_items_owner_parent_idx" ON "evidence_items" USING btree ("owner_id","parent_id");--> statement-breakpoint
CREATE INDEX "experiences_owner_parent_idx" ON "experiences" USING btree ("owner_id","parent_id");--> statement-breakpoint
CREATE INDEX "fit_assessments_owner_parent_idx" ON "fit_assessments" USING btree ("owner_id","parent_id");--> statement-breakpoint
CREATE INDEX "jobs_owner_parent_idx" ON "jobs" USING btree ("owner_id","parent_id");--> statement-breakpoint
CREATE INDEX "outreach_records_owner_parent_idx" ON "outreach_records" USING btree ("owner_id","parent_id");--> statement-breakpoint
CREATE INDEX "projects_owner_parent_idx" ON "projects" USING btree ("owner_id","parent_id");--> statement-breakpoint
CREATE INDEX "proof_records_owner_parent_idx" ON "proof_records" USING btree ("owner_id","parent_id");--> statement-breakpoint
CREATE INDEX "resume_versions_owner_parent_idx" ON "resume_versions" USING btree ("owner_id","parent_id");--> statement-breakpoint
CREATE INDEX "resumes_owner_parent_idx" ON "resumes" USING btree ("owner_id","parent_id");--> statement-breakpoint
CREATE INDEX "search_profiles_owner_parent_idx" ON "search_profiles" USING btree ("owner_id","parent_id");--> statement-breakpoint
CREATE INDEX "search_sessions_owner_parent_idx" ON "search_sessions" USING btree ("owner_id","parent_id");--> statement-breakpoint
CREATE INDEX "session_user_idx" ON "auth_session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "skill_evidence_owner_parent_idx" ON "skill_evidence" USING btree ("owner_id","parent_id");--> statement-breakpoint
CREATE INDEX "tailoring_plans_owner_parent_idx" ON "tailoring_plans" USING btree ("owner_id","parent_id");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "auth_verification" USING btree ("identifier");
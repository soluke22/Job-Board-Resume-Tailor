CREATE TABLE "company_watchlists" (
	"owner_id" text NOT NULL,
	"id" text NOT NULL,
	"parent_id" text,
	"label" text,
	"status" text,
	"data" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"name" text,
	CONSTRAINT "company_watchlists_owner_id_id_pk" PRIMARY KEY("owner_id","id")
);
--> statement-breakpoint
ALTER TABLE "company_watchlists" ADD CONSTRAINT "company_watchlists_owner_id_workspaces_owner_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."workspaces"("owner_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "company_watchlists_owner_parent_idx" ON "company_watchlists" USING btree ("owner_id","parent_id");
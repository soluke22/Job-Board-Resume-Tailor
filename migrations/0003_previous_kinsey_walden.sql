CREATE TABLE "provider_usage" (
	"owner_id" text NOT NULL,
	"category" text NOT NULL,
	"window" text NOT NULL,
	"count" integer NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	CONSTRAINT "provider_usage_owner_id_category_window_pk" PRIMARY KEY("owner_id","category","window")
);
--> statement-breakpoint
ALTER TABLE "provider_usage" ADD CONSTRAINT "provider_usage_owner_id_auth_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."auth_user"("id") ON DELETE cascade ON UPDATE no action;
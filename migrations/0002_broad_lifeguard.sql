CREATE TABLE "private_file_uploads" (
	"owner_id" text NOT NULL,
	"id" text NOT NULL,
	"blob_path" text NOT NULL,
	"state" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "private_file_uploads_owner_id_id_pk" PRIMARY KEY("owner_id","id"),
	CONSTRAINT "private_file_uploads_blob_path_unique" UNIQUE("blob_path")
);
--> statement-breakpoint
ALTER TABLE "private_file_uploads" ADD CONSTRAINT "private_file_uploads_owner_id_auth_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."auth_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "private_file_uploads_owner_updated_idx" ON "private_file_uploads" USING btree ("owner_id","updated_at");
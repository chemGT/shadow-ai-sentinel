ALTER TABLE "tenants" ADD COLUMN "status" text DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "past_due_since" timestamp with time zone;

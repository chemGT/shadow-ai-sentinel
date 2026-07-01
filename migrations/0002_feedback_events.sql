CREATE TABLE "feedback_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"rule_type" text NOT NULL,
	"context_choice" text NOT NULL,
	"host" text NOT NULL,
	"ts" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "feedback_events" ADD CONSTRAINT "feedback_events_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "feedback_tenant_ts_idx" ON "feedback_events" USING btree ("tenant_id","ts");--> statement-breakpoint
CREATE INDEX "feedback_rule_idx" ON "feedback_events" USING btree ("tenant_id","rule_type");

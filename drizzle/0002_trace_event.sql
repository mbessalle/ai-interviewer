CREATE TABLE "trace_event" (
	"id" serial PRIMARY KEY NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL,
	"trace_id" text,
	"span_id" text,
	"parent_span_id" text,
	"kind" text NOT NULL,
	"name" text NOT NULL,
	"status" text DEFAULT 'ok' NOT NULL,
	"duration_ms" integer,
	"interview_id" text,
	"call_id" text,
	"input" jsonb,
	"output" jsonb,
	"error" text
);
--> statement-breakpoint
CREATE INDEX "trace_event_at" ON "trace_event" USING btree ("at");--> statement-breakpoint
CREATE INDEX "trace_event_trace" ON "trace_event" USING btree ("trace_id");--> statement-breakpoint
CREATE INDEX "trace_event_call" ON "trace_event" USING btree ("call_id");--> statement-breakpoint
CREATE INDEX "trace_event_interview" ON "trace_event" USING btree ("interview_id");
CREATE TYPE "public"."plan" AS ENUM('free', 'pro', 'free_trial_over');--> statement-breakpoint
CREATE TABLE "feedback" (
	"id" serial PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"interview_id" text,
	"email" text,
	"feedback" text,
	"satisfaction" integer
);
--> statement-breakpoint
CREATE TABLE "interview" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"name" text,
	"description" text,
	"objective" text,
	"organization_id" text,
	"user_id" text,
	"interviewer_id" integer,
	"is_active" boolean DEFAULT true,
	"is_anonymous" boolean DEFAULT false,
	"is_archived" boolean DEFAULT false,
	"logo_url" text,
	"theme_color" text,
	"url" text,
	"readable_slug" text,
	"questions" jsonb,
	"quotes" jsonb[],
	"insights" text[],
	"respondents" text[],
	"question_count" integer,
	"response_count" integer,
	"time_duration" text,
	"language" text DEFAULT 'en'
);
--> statement-breakpoint
CREATE TABLE "interviewer" (
	"id" serial PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"agent_id" text,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"image" text NOT NULL,
	"audio" text,
	"empathy" integer NOT NULL,
	"exploration" integer NOT NULL,
	"rapport" integer NOT NULL,
	"speed" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organization" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"name" text,
	"image_url" text,
	"allowed_responses_count" integer,
	"plan" "plan"
);
--> statement-breakpoint
CREATE TABLE "response" (
	"id" serial PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"interview_id" text,
	"name" text,
	"email" text,
	"call_id" text,
	"candidate_status" text,
	"duration" integer,
	"details" jsonb,
	"analytics" jsonb,
	"is_analysed" boolean DEFAULT false,
	"is_ended" boolean DEFAULT false,
	"is_viewed" boolean DEFAULT false,
	"tab_switch_count" integer,
	"language" text DEFAULT 'en'
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"email" text,
	"organization_id" text
);
--> statement-breakpoint
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_interview_id_interview_id_fk" FOREIGN KEY ("interview_id") REFERENCES "public"."interview"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interview" ADD CONSTRAINT "interview_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interview" ADD CONSTRAINT "interview_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interview" ADD CONSTRAINT "interview_interviewer_id_interviewer_id_fk" FOREIGN KEY ("interviewer_id") REFERENCES "public"."interviewer"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "response" ADD CONSTRAINT "response_interview_id_interview_id_fk" FOREIGN KEY ("interview_id") REFERENCES "public"."interview"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE no action ON UPDATE no action;
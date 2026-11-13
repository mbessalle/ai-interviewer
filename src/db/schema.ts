import { sql } from "drizzle-orm";
import {
  boolean,
  customType,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  serial,
  text,
} from "drizzle-orm/pg-core";

/**
 * Property names match the column names (snake_case) on purpose: the rest of the app reads
 * rows as `interview.organization_id`, so a row leaves this layer in the shape it is used in.
 */

/** A timestamptz that is read as an ISO 8601 string, which is what the UI formats. */
const isoTimestamp = customType<{ data: string; driverData: string | Date }>({
  dataType: () => "timestamp with time zone",
  fromDriver: (value) => new Date(value).toISOString(),
});

const createdAt = () =>
  isoTimestamp("created_at")
    .notNull()
    .default(sql`now()`);

export const plan = pgEnum("plan", ["free", "pro", "free_trial_over"]);

export const organization = pgTable("organization", {
  id: text("id")
    .primaryKey()
    .default(sql`gen_random_uuid()::text`),
  created_at: createdAt(),
  name: text("name"),
  image_url: text("image_url"),
  allowed_responses_count: integer("allowed_responses_count"),
  plan: plan("plan"),
});

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  created_at: createdAt(),
  email: text("email"),
  organization_id: text("organization_id").references(() => organization.id),
});

export const interviewer = pgTable("interviewer", {
  id: serial("id").primaryKey(),
  created_at: createdAt(),
  agent_id: text("agent_id"),
  name: text("name").notNull(),
  description: text("description").notNull(),
  image: text("image").notNull(),
  audio: text("audio"),
  empathy: integer("empathy").notNull(),
  exploration: integer("exploration").notNull(),
  rapport: integer("rapport").notNull(),
  speed: integer("speed").notNull(),
});

export const interview = pgTable("interview", {
  id: text("id").primaryKey(),
  created_at: createdAt(),
  name: text("name"),
  description: text("description"),
  objective: text("objective"),
  organization_id: text("organization_id").references(() => organization.id),
  user_id: text("user_id").references(() => user.id),
  interviewer_id: integer("interviewer_id").references(() => interviewer.id),
  is_active: boolean("is_active").default(true),
  is_anonymous: boolean("is_anonymous").default(false),
  is_archived: boolean("is_archived").default(false),
  logo_url: text("logo_url"),
  theme_color: text("theme_color"),
  url: text("url"),
  readable_slug: text("readable_slug"),
  questions: jsonb("questions").$type<any>(),
  quotes: jsonb("quotes").$type<any>().array(),
  insights: text("insights").array(),
  respondents: text("respondents").array(),
  question_count: integer("question_count"),
  response_count: integer("response_count"),
  time_duration: text("time_duration"),
  language: text("language").default("en"),
});

export const response = pgTable("response", {
  id: serial("id").primaryKey(),
  created_at: createdAt(),
  interview_id: text("interview_id").references(() => interview.id),
  name: text("name"),
  email: text("email"),
  call_id: text("call_id"),
  candidate_status: text("candidate_status"),
  duration: integer("duration"),
  details: jsonb("details").$type<any>(),
  analytics: jsonb("analytics").$type<any>(),
  is_analysed: boolean("is_analysed").default(false),
  is_ended: boolean("is_ended").default(false),
  is_viewed: boolean("is_viewed").default(false),
  tab_switch_count: integer("tab_switch_count"),
  language: text("language").default("en"),
});

export const feedback = pgTable("feedback", {
  id: serial("id").primaryKey(),
  created_at: createdAt(),
  interview_id: text("interview_id").references(() => interview.id),
  email: text("email"),
  feedback: text("feedback"),
  satisfaction: integer("satisfaction"),
});

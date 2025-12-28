# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AI-Interviewer is an AI-powered voice interview platform for hiring. It enables recruiters to create interviews with AI-generated questions, and candidates complete voice interviews with AI agents (Lisa/Bob) powered by Retell AI. Responses are analyzed using OpenAI GPT-4o.

## Development Commands

```bash
yarn dev          # Start development server (localhost:3000)
yarn build        # Build for production
yarn start        # Run production build
yarn lint         # Run ESLint
yarn lint --fix   # Fix linting issues

# Code formatting (run before commits)
npx prettier --write .
```

## Tech Stack

- **Framework**: Next.js 14 with App Router, TypeScript
- **Database**: Supabase (PostgreSQL) - direct client queries, no ORM
- **Auth**: Clerk (user & organization management)
- **AI**: OpenAI GPT-4o (questions/analysis), Retell AI (voice conversations)
- **UI**: Tailwind CSS, Shadcn/UI, Radix UI
- **State**: React Context + TanStack React Query

## Architecture

### Route Groups
- `src/app/(client)/` - Protected recruiter routes (dashboard, interviews) - requires Clerk auth
- `src/app/(user)/` - Public candidate routes (`/call/[interviewId]`) - no auth required
- `src/app/api/` - API routes for interview management, AI calls, webhooks

### Key Directories
- `src/services/` - Data access layer (Supabase queries for interviews, responses, etc.)
- `src/contexts/` - React Context providers for global state
- `src/hooks/` - Custom React hooks for data fetching
- `src/components/ui/` - Shadcn/UI components
- `src/lib/prompts/` - AI prompt templates (English & Spanish)
- `src/types/` - TypeScript types including `database.types.ts` (Supabase-generated)

### API Endpoints
- `POST /api/create-interview` - Create interview with questions
- `POST /api/generate-interview-questions` - AI question generation from job description
- `POST /api/register-call` - Start voice call session with Retell AI
- `GET /api/get-call` - Get call status/recording
- `POST /api/generate-insights` - AI analysis of candidate responses
- `POST /api/response-webhook` - Retell AI callback for call events

### Data Flow
1. Recruiter creates interview → questions stored in `interview` table
2. Candidate accesses `/call/[id]` → voice call registered with Retell AI
3. Call completes → webhook triggers → response saved to `response` table
4. Analysis requested → OpenAI processes transcript → insights stored

## Database Schema

Main tables in Supabase (see `supabase_schema.sql`):
- `organization` - Multi-tenant support with plan tiers (free/pro)
- `user` - Clerk users linked to organizations
- `interviewer` - AI agent configurations (empathy, exploration, rapport, speed)
- `interview` - Interview configs with questions (JSONB), insights, settings
- `response` - Candidate responses with call_id, duration, analytics (JSONB)
- `feedback` - Post-interview satisfaction ratings

## Environment Variables

Required in `.env.local` (see `.env.example`):
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY` - Clerk auth
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Database
- `OPENAI_API_KEY` - Question generation and analysis
- `RETELL_API_KEY` - Voice interview orchestration
- `NEXT_PUBLIC_LIVE_URL` - Application URL for interview links

## Code Patterns

- Services use Supabase client: `createClientComponentClient<Database>()` from `@supabase/auth-helpers-nextjs`
- API routes export `POST`/`GET` handlers returning `NextResponse.json()`
- Components use `"use client"` directive for client-side interactivity
- Forms use React Hook Form with Zod validation
- Path alias: `@/*` maps to `./src/*`

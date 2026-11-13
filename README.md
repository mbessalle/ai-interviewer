# AI Interviewer

[![CI](https://github.com/mbessalle/ai-interviewer/actions/workflows/ci.yml/badge.svg)](https://github.com/mbessalle/ai-interviewer/actions/workflows/ci.yml)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue)
[![License: MIT](https://img.shields.io/badge/license-MIT-green)](LICENSE)

A voice interviewer for hiring. A recruiter describes a role, the app generates the interview questions, and
each candidate gets a link where an AI agent interviews them by voice, in English or Spanish. The recruiter
then sees the transcript, a communication analysis with supporting quotes, and insights across all candidates.

Live: [ai-interviewer-neon.vercel.app](https://ai-interviewer-neon.vercel.app) (sign-in required).

|                            |                                                                                                               |
| -------------------------- | ------------------------------------------------------------------------------------------------------------- |
| **Full stack**             | Next.js 14 (App Router), TypeScript, Tailwind, shadcn/ui, Supabase (Postgres), Clerk auth, deployed on Vercel |
| **Voice AI**               | Retell for the real-time voice call; OpenAI for question generation, analysis and insights                    |
| **Validated model output** | Every model reply is parsed against a zod schema before it is stored or shown                                 |
| **OpenTelemetry**          | Requests and model calls are traced, with model and token usage on each call                                  |
| **Quality gates**          | Formatting, lint, strict type check, tests and a production build on every push                               |

## How it works

```mermaid
sequenceDiagram
    actor R as Recruiter
    actor C as Candidate
    participant App as Next.js app
    participant LLM as OpenAI
    participant Voice as Retell
    participant DB as Supabase

    R->>App: role, objective, optional documents
    App->>LLM: generate questions (JSON)
    LLM-->>App: questions + description
    Note over App: reply validated against a zod schema
    App->>DB: save interview
    R->>C: share interview link
    C->>App: open link (no account needed)
    App->>Voice: register call with the questions
    Voice-->>C: live voice interview
    Voice->>App: webhook when the call ends
    App->>LLM: analyse transcript, generate insights (JSON)
    Note over App: replies validated, calls traced
    App->>DB: save response and analysis
    R->>App: dashboard: transcripts, scores, insights
```

## Model output is validated and traced

The three AI routes go through one helper, [`src/lib/llm/chat.ts`](src/lib/llm/chat.ts):

- **Validated.** Each prompt has a zod schema in [`src/lib/llm/schemas.ts`](src/lib/llm/schemas.ts): questions must be a
  non-empty list, a communication score must be between 0 and 10, a quote's type must be `strength` or
  `improvement_area`. A reply that does not fit is rejected with a `502` and the list of what was wrong, and is
  never written to the database.
- **Traced.** Each call is an OpenTelemetry span carrying the GenAI attributes (`gen_ai.request.model`,
  `gen_ai.usage.input_tokens`, `gen_ai.usage.output_tokens`), what the call was for, and whether the reply was
  valid. [`src/instrumentation.ts`](src/instrumentation.ts) turns tracing on at server start; on Vercel the traces appear in
  the project's observability view, and `OTEL_EXPORTER_OTLP_ENDPOINT` sends them to any OTLP collector.
- **Tested.** [`tests/llm.test.ts`](tests/llm.test.ts) runs the helper against a stand-in client: valid replies, four kinds of
  malformed reply, a provider failure, and the span attributes.

## Run it

```bash
yarn install
cp .env.example .env.local   # Clerk, Supabase, Retell and OpenAI keys
# create the tables: run supabase_schema.sql in your Supabase project
yarn dev                     # http://localhost:3000
```

```bash
yarn test        # unit tests, no keys or network needed
yarn typecheck
yarn lint
yarn build
```

## Layout

| Path                   | What it holds                                                                                  |
| ---------------------- | ---------------------------------------------------------------------------------------------- |
| `src/app/(client)/`    | Recruiter side: dashboard, interview pages, sign-in                                            |
| `src/app/(user)/call/` | Candidate side: the public voice-interview page                                                |
| `src/app/api/`         | Route handlers: question generation, call registration, the Retell webhook, analysis, insights |
| `src/lib/llm/`         | The validated, traced model-call helper and its schemas                                        |
| `src/lib/prompts/`     | Prompts, in English and Spanish                                                                |
| `src/services/`        | Supabase data access                                                                           |
| `supabase_schema.sql`  | Database schema                                                                                |
| `tests/`               | Unit tests                                                                                     |

## Status

- The model-reply validation and tracing are covered by unit tests and the production build; they have not yet
  been exercised against the live services after this change.
- There are no end-to-end tests of the voice call.

## License

MIT

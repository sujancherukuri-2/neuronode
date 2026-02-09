# Documentation

## Portable Architecture

NEURONODE is designed as a portable knowledge system with a clear separation between UI, data, and AI services.

- UI: Next.js App Router, React, Tailwind CSS.
- Data: MongoDB via Mongoose, CRUD APIs under /api.
- AI: Server-side Gemini integration for summarization and Q&A.
- Jobs: Optional decay agent triggered by cron to keep knowledge fresh.

Portability comes from:

- A single source of truth for notes (MongoDB + schemas).
- API boundaries that can be moved to another runtime without changing UI.
- A demo mode for static hosting (GitHub Pages).

## System Data Flow

1. Create Note -> API validates input -> AI summarization + tag suggestion -> stored in MongoDB.
2. Query -> API retrieves relevant notes -> AI composes answer -> UI shows answer + sources.
3. Decay -> cron hits API -> confidence scores decay by last access date.

## UX Principles

- Calm, high-contrast typography and hierarchy for focus.
- Cards as visual containers to support scanability.
- Consistent spacing and alignment to reduce cognitive load.
- Action-first layout: input or action is always near results.

## Agent Thinking (Prompting Strategy)

- Expand beyond notes when context is insufficient.
- Provide multi-paragraph explanations with examples.
- Always cite relevant notes when possible.
- Prefer clarity and depth over short keyword lists.

## Infrastructure Details

- Local dev: Next.js dev server + MongoDB Atlas.
- Production: Vercel (full stack) or GitHub Pages (static demo).
- Secrets: GEMINI_API_KEY, MONGODB_URI, CRON_SECRET.
- Static demo mode: NEXT_PUBLIC_DEMO=true with mock data.

# NEURONODE - AI Second Brain

An AI-powered knowledge system that treats notes like a living system. Notes gain confidence when used and decay when neglected. Answers always show sources.

## Features

- Create notes, links, and insights
- AI summarization and auto-tagging
- Conversational querying with sources
- Background decay agent (cron)
- Public read-only API

## Tech Stack

- Next.js App Router, React, Tailwind CSS
- MongoDB Atlas
- Gemini (server-side)
- Vercel deployment

## Local Setup

1. Install dependencies

```bash
npm install
```

2. Configure environment

```bash
copy .env.example .env.local
```

Set `MONGODB_URI`, `GEMINI_API_KEY`, and optionally `CRON_SECRET`.

3. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## GitHub Pages (Static Demo)

GitHub Pages only supports static sites. This project includes a demo mode that disables API calls and uses mock data so the UI can run on Pages.

Environment variables for Pages build:

- `NEXT_PUBLIC_DEMO=true`
- `NEXT_PUBLIC_BASE_PATH=/neuronode`
- `GITHUB_PAGES=true`

Windows (cmd):

```bash
set NEXT_PUBLIC_DEMO=true
set NEXT_PUBLIC_BASE_PATH=/neuronode
set GITHUB_PAGES=true
npm run build
```

macOS/Linux:

```bash
export NEXT_PUBLIC_DEMO=true
export NEXT_PUBLIC_BASE_PATH=/neuronode
export GITHUB_PAGES=true
npm run build
```

The GitHub Actions workflow builds and deploys automatically to Pages.

## Vercel (Full Stack, Recommended)

Vercel supports the full Next.js stack (API routes + MongoDB). This is the easiest way to deploy the complete app.

1. Go to https://vercel.com and sign in.
2. Click **New Project** and import `sujancherukuri-2/neuronode`.
3. Framework: **Next.js** (auto-detected).
4. Add environment variables:
	- `MONGODB_URI`
	- `GEMINI_API_KEY`
	- `GEMINI_MODEL` (optional, default `gemini-1.5-flash`)
	- `CRON_SECRET` (optional)
	- `DECAY_RATE_PER_DAY` (optional, default `0.015`)
5. Click **Deploy** and use the live URL Vercel provides.

## Documentation

- Architecture + UX principles: [docs/architecture.md](docs/architecture.md)
- Video analysis script: [docs/video-analysis.md](docs/video-analysis.md)

## API Overview

- `GET /api/notes` - list notes
- `POST /api/notes` - create a note (auto summarization + tags)
- `GET /api/notes/:id` - fetch a note (updates access time)
- `PUT /api/notes/:id` - update a note
- `DELETE /api/notes/:id` - delete a note
- `POST /api/query` - ask the knowledge base
- `POST /api/decay` - decay confidence (protected with `CRON_SECRET`)
- `GET /api/public/notes` - public listing
- `POST /api/public/query` - public query

## Background Decay

The decay agent runs on Vercel cron (`vercel.json`). It reduces confidence based on days since last access. Configure the rate with `DECAY_RATE_PER_DAY`.

## One-Line Pitch

"An AI Second Brain that treats knowledge as a living system - storing, reasoning, and maintaining it over time."

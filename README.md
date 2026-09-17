# Meal Planner

A full-stack meal planning app that generates weekly meal plans with the Edamam Meal
Planner API, protected by Supabase-authenticated requests and cached in Supabase.

> **Status — backend first.** `POST /api/meal-plans` works end to end. The React client
> is still a placeholder and per-recipe details are not expanded yet. See
> [docs/Architecture.md](docs/Architecture.md) for what exists.

## Features

| Feature | Status |
|---|---|
| Weekly plan generation (days, meals, health labels) | ✅ working |
| JWT-protected API | ✅ working |
| Meal plans cached in Supabase | ✅ working |
| Full recipe + nutrition details per meal | 🚧 not implemented |
| Client UI (auth, plan builder, plan display) | 🚧 placeholder |

## Prerequisites

- Node.js 18+ (global `fetch`, used for the Edamam calls, requires 18+; 20+ recommended)
- A [Supabase](https://supabase.com) project (database + auth)
- An [Edamam](https://developer.edamam.com) developer account

## Quick Start

### 1. Install dependencies

```bash
cd client && npm install
cd ../server && npm install
```

### 2. Configure environment

```bash
cp server/.env.example server/.env
```

Then fill in `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `EDAMAM_APP_ID`, and
`EDAMAM_APP_KEY`. See the comments in `.env.example` for where each value comes from.

### 3. Run

```bash
# Terminal 1 — backend
cd server && npm run dev

# Terminal 2 — frontend
cd client && npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

## API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/health` | none | Health check — returns `{ status: "Okay!" }` |
| POST | `/api/meal-plans` | Bearer JWT | Generate a weekly meal plan and cache it |

### Authentication

`POST /api/meal-plans` requires a valid Supabase JWT in the
`Authorization: Bearer <token>` header. Tokens are verified server-side against
Supabase; requests with a missing or invalid token get `401`.

## Project Docs

- [AGENTS.md](AGENTS.md) — commands, conventions, and gotchas (written for AI agents)
- [docs/Architecture.md](docs/Architecture.md) — directory layout, request flow, schema
- [docs/Deploy.md](docs/Deploy.md) — production deploy on Vercel + Render

## License

ISC

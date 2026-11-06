# Meal Planner

A full-stack meal planning app that generates weekly meal plans with the Edamam Meal
Planner API, protected by Supabase-authenticated requests and cached in Supabase.

> **Status — backend + auth UI.** `POST /api/meal-plans` works end to end and expands
> each meal into full recipe details before saving. The client has sign-up and log-in
> screens; the plan builder and plan display are not built yet. See
> [docs/Architecture.md](docs/Architecture.md) for what exists.


## Features

| Feature | Status |
|---|---|
| Weekly plan generation (days, meals, health labels) | ✅ working |
| JWT-protected API | ✅ working |
| Meal plans cached in Supabase | ✅ working |
| Full recipe details per meal (label, image, calories, ingredients) | ✅ working |
| Client auth UI (sign up / log in) | ✅ working |
| Client login/sign-up styling per docs/design.md + design-reference.png | ✅ working |
| Dashboard navbar (logo, user name/email, log out) | ✅ working |
| Client plan builder + plan display | 🚧 not implemented |

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

The client also needs its own Supabase browser credentials — copy the template:

```bash
cp client/.env.example client/.env
```

and fill in `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (Supabase → Project
Settings → API). Both are public values that ship in the browser bundle; never put the
service role key or Edamam credentials in a `VITE_` variable.

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
| POST | `/api/meal-plans` | Bearer JWT | Generate a weekly meal plan, expand recipe details, and cache it |
| GET | `/api/meal-plans` | Bearer JWT | List the logged-in user's saved plans |

### Usage notes

- Routes: `/` redirects to `/login`; `/login` and `/signup` are public; `/dashboard` is
  protected by `ProtectedRoute` (verified Supabase session).
- After a successful login, `LoginPage.jsx` navigates to `/dashboard`; `SignUpPage.jsx`
  sends the user to `/login`.
- `/dashboard` renders the navbar (logo, user name/email, log out) plus a placeholder
  welcome line; a real plan builder and plan display are not built yet.
- Logging out from the navbar calls `supabase.auth.signOut()` and returns to `/login`.

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

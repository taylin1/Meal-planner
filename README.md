# Meal Planner

A full-stack meal planning app that generates weekly meal plans with the Edamam Meal
Planner API, protected by Supabase-authenticated requests and cached in Supabase.

> **Status — dashboard plan builder.** `POST /api/meal-plans` works end to end and
> expands each meal into full recipe details before saving. The client has sign-up and
> log-in screens, plus a dashboard that generates plans and lists, views, and deletes
> saved ones, with recipe images, expandable ingredients, and recipe links. The day tabs
> and calorie donut are not built yet. See
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
| Client plan builder (days, meals, diet) | ✅ working |
| Client saved plans (list, view, delete) | ✅ working |
| Recipe detail cards (image, ingredients, full recipe link) | ✅ working |
| Responsive dashboard (one column on phones, builder beside plan on laptops) | ✅ working |
| Footer (full width, author + current year, on every route) | ✅ working |
| Client plan display (day tabs, calorie donut) | 🚧 not implemented |
| In-browser AI answers (ask food/health questions, get AI answer offline) | ✅ working |

## Prerequisites

- Node.js 18+ (global `fetch`, used for the Edamam calls, requires 18+; 20+ recommended)
- A [Supabase](https://supabase.com) project (database + auth)
- An [Edamam](https://developer.edamam.com) developer account
- Chrome or Edge for the ask bar (the model runs locally and needs WebGPU)

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
Settings → API), plus `VITE_API_URL` — the Express origin, which defaults to
`http://localhost:3001` when unset. All `VITE_` values are public and ship in the
browser bundle; never put the service role key or Edamam credentials in one.

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
| DELETE | `/api/meal-plans/:id` | Bearer JWT | Delete one of the logged-in user's plans |

### Usage notes

- Routes: `/` redirects to `/login`; `/login` and `/signup` are public; `/dashboard` is
  protected by `ProtectedRoute` (verified Supabase session).
- After a successful login, `LoginPage.jsx` navigates to `/dashboard`; `SignUpPage.jsx`
  sends the user to `/login`.
- `/dashboard` renders the navbar, a plan builder (1–7 days, Breakfast/Lunch/Dinner,
  one optional diet), the plan preview (per-day meals with image, kcal, expandable
  ingredients, and a recipe link), and the saved plans list. Day tabs and the calorie
  donut are not built yet. The dashboard is mobile-first: one column on phones, and from
  `lg` a 380px builder column beside the plan. The navbar and Saved plans run
  edge-to-edge on phones and become rounded cards from `sm`.
- `<Footer />` renders on every route from `App.jsx` (outside `<Routes>`) and shows only
  the author and the current year.
- Logging out from the navbar calls `supabase.auth.signOut()` and returns to `/login`.

### Authentication

`POST /api/meal-plans` requires a valid Supabase JWT in the
`Authorization: Bearer <token>` header. Tokens are verified server-side against
Supabase; requests with a missing or invalid token get `401`.

### In-browser AI answers

The ask bar has no API endpoint. `client/src/lib/qvacModel.js` loads
`Qwen3-0.6B-q4f16_1-MLC` with WebLLM inside a Web Worker, so the question never leaves
the browser. The model needs **WebGPU** (Chrome/Edge) and downloads about 350 MB of
weights the first time; the browser caches them, and later visits work offline.

- First food/health question waits for the model to load; the card shows progress
- Questions must be food- or health-related (whole-word keyword topic guard in
  `client/src/lib/foodHealthGuard.js`), otherwise the ask card shows
  "Please ask a food or health related question."
- Off-topic and empty-answer errors render in the existing answer card
- Set `VITE_HIDE_QVAC=true` to hide the ask bar, or `VITE_QVAC_MODEL_ID` to pick a
  different WebLLM model
- No server model, no weights on Render, no `503` model-loading errors

## Project Docs

- [AGENTS.md](AGENTS.md) — commands, conventions, and gotchas (written for AI agents)
- [docs/Architecture.md](docs/Architecture.md) — directory layout, request flow, schema
- [docs/Deploy.md](docs/Deploy.md) — production deploy on Vercel + Render

## License

ISC

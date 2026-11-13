# AGENTS.md — AI Agent Context

Operational context for AI coding agents working in this repo. Everything here
should be actionable. Deep reference material lives in `docs/` — see the
[Documentation Map](#documentation-map).

## Quick Reference

- **Stack**: React 19 + Vite 8 + Tailwind 4 (client) · Express 5 + Supabase (server)
- **Language**: JavaScript (JSX), no TypeScript
- **Package manager**: npm (no workspaces — client and server are independent)
- **Modules**: client is ESM (`import`/`export`) · server is CommonJS (`require`/`module.exports`)

## Commands

```bash
# Client — run from client/
npm run dev       # Vite dev server → :5173
npm run build     # Production build
npm run preview   # Serve the production build locally
npm run lint      # ESLint

# Server — run from server/
npm run dev       # nodemon → :3001
npm start         # plain node (production)
npm test          # Jest
```

## Conventions

- **JSX files only** — use `.jsx`, not `.js`, for React components
- **Flat ESLint config** — `eslint.config.js` format, not `.eslintrc`
- **Tailwind CSS 4** — via `@tailwindcss/vite` plugin, not PostCSS
- **Express 5** — not v4; async errors are caught automatically
- **Supabase client** — always import from `server/src/lib/supabaseClient.js`
- **Mobile-first layout** — the dashboard container is `mx-auto max-w-5xl px-4`. Full-bleed
  sections (navbar, saved plans) use `-mx-4 sm:mx-0` inside it; the footer is
  `w-screen max-w-full` so `100vw` cannot add a scrollbar.

## Environment Variables

Canonical list: `server/.env.example`. Copy it to `server/.env` and fill in values.

| Variable | Notes |
|---|---|
| `PORT` | Server port, defaults to `3001` |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Bypasses Row Level Security — server-side only |
| `EDAMAM_APP_ID` / `EDAMAM_APP_KEY` | Edamam Meal Planner credentials |
| `CLIENT_URL` | Must be the **client** origin (`http://localhost:5173`) |

Client env vars live in `client/.env` (Vite, prefix `VITE_`) — template:
`client/.env.example`:

| Variable | Notes |
|---|---|
| `VITE_SUPABASE_URL` | Supabase project URL — public browser value |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon key — public browser value |
| `VITE_API_URL` | Express origin; unset falls back to `http://localhost:3001` |
| `VITE_QVAC_MODEL_ID` | Optional WebLLM model id; defaults to `Qwen3-0.6B-q4f16_1-MLC` |
| `VITE_HIDE_QVAC` | Set to `true` to hide `QuestionBar` and `DisplayAnswer` entirely |

Never put `SUPABASE_SERVICE_ROLE_KEY` or Edamam credentials in a `VITE_` var; Vite
inlines them into the bundle.

`.env` is gitignored — never commit secrets.

## Gotchas

- **CORS depends on `CLIENT_URL`.** `server/src/index.js` uses
  `origin: process.env.CLIENT_URL || 'http://localhost:3001'` — the fallback is the
  server's own port, so if `CLIENT_URL` is unset the browser client at `:5173` is
  blocked. Always set it.
- **Import order matters.** `server/src/index.js` calls `dotenv.config()` before any
  other import for this reason: `lib/supabaseClient.js` throws at import time when its
  env vars are missing, so it must never be required before dotenv has run.
- Client (:5173) and server (:3001) run on **separate ports**.
- **Express 5 reports listen failures through the callback.** `app.listen(PORT, (error) => …)`
  in `server/src/index.js` receives `EADDRINUSE` instead of throwing it, so a busy
  `:3001` (usually a stale `node` process) must be checked explicitly — otherwise the
  log says "running" and the process exits 0.
- Edamam API calls are **server-side only** — never expose API keys to the client.
- No root `package.json` — `npm install` must be run in `client/` and `server/` separately.
- **No client tests.** The server has Jest; `src/lib/mealPlanBuilder.test.js` and
  `src/routes/mealplans.test.js` cover validation, generation, listing, and deletion.
- **`minmax(0, …)` is load-bearing in the plan grid.** `Dashboard.jsx` uses
  `grid grid-cols-1 gap-6 lg:grid-cols-[380px_minmax(0,1fr)]`. Recipe titles use
  `truncate` (`white-space: nowrap`), so an `auto`/`1fr` track is sized by the longest
  dish name — the plan cards grew to roughly twice the page width and made the navbar
  and saved plans look shrunken. Keep the `minmax(0, …)` and `grid-cols-1`.

- **The Qwen3 model runs in the browser, not on the server.** `client/src/lib/qvacModel.js`
  loads `Qwen3-0.6B-q4f16_1-MLC` through WebLLM inside a Web Worker
  (`client/src/lib/qvacWorker.js`). WebGPU is required (Chrome/Edge); the ~350 MB of
  weights are downloaded once from Hugging Face and cached by the browser, so later
  loads work offline. The server has no model, no `/ask` route, and no `@qvac/sdk`
  dependency. `/no_think` plus `enable_thinking: false` keeps answers short and fast.
  See ADR-006 in `docs/descisions.md`.
- **The ask bar needs a secure origin.** WebGPU and the model cache require HTTPS (or
  localhost). On an unsupported browser the ask card shows a "could not load" message
  instead of an answer.

## Known Incomplete — do not assume these work

- **Plan view has no day tabs or calorie donut.** `App.jsx` defines `/login`, `/signup`,
  and a protected `/dashboard`; `/` redirects to `/login`. `LoginPage.jsx` navigates to
  `/dashboard` after login, while `SignUpPage.jsx` sends users to `/login`.
  `Dashboard.jsx` renders the navbar, `PlanBuilder`, `PlanPreview` (per-day meals with
  image, kcal, expandable ingredients, and a full-recipe link), and `SavedPlans`. Choosing
  View in `SavedPlans` previews that plan above and scrolls it into view. Day tabs and the
  calorie donut are not built yet.
- **`attachRecipeDetails()` fetches sequentially.** It awaits each recipe link one at a
  time inside nested loops, so a full week costs ~20+ serial HTTP calls to Edamam.
- Per-meal calorie ranges and dish/meal-type filters are fixed defaults in
  `server/src/lib/mealPlanBuilder.js` — not user-configurable.

## Documentation Map

- `README.md` — human-facing: overview, setup, API surface
- `docs/Architecture.md` — directory layout, request flow, database schema
- `docs/Deploy.md` — production topology, Render + Vercel config, deploy order
- `client/vercel.json` — SPA rewrite so client routes survive a refresh on Vercel
- `server/.env.example` — canonical environment variable list
- `AGENTS.md` (this file) — commands, conventions, gotchas for agents

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

## Environment Variables

Canonical list: `server/.env.example`. Copy it to `server/.env` and fill in values.

| Variable | Notes |
|---|---|
| `PORT` | Server port, defaults to `3001` |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Bypasses Row Level Security — server-side only |
| `EDAMAM_APP_ID` / `EDAMAM_APP_KEY` | Edamam Meal Planner credentials |
| `CLIENT_URL` | Must be the **client** origin (`http://localhost:5173`) |

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
- Edamam API calls are **server-side only** — never expose API keys to the client.
- No root `package.json` — `npm install` must be run in `client/` and `server/` separately.
- **No client tests.** The server has Jest; `supertest` is installed but no test files exist yet.

## Known Incomplete — do not assume these work

- **Recipe details are not wired up.** `attachRecipeDetails()` in
  `server/src/routes/mealplans.js` is fully written but never called (marked "Phase 7"),
  so `meal_plans.plan_data` stores raw Edamam `/select` output — recipe URIs, not recipes.
- **The client is a placeholder.** `client/src/App.jsx` renders "Hello World".
  `react-router-dom` and `@supabase/supabase-js` are installed on the client but unused.
- Per-meal calorie ranges and dish/meal-type filters are fixed defaults in
  `server/src/lib/mealPlanBuilder.js` — not user-configurable.

## Documentation Map

- `README.md` — human-facing: overview, setup, API surface
- `docs/Architecture.md` — directory layout, request flow, database schema
- `docs/Deploy.md` — production topology, Render + Vercel config, deploy order
- `server/.env.example` — canonical environment variable list
- `AGENTS.md` (this file) — commands, conventions, gotchas for agents

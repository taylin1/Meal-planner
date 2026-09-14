# AGENTS.md — AI Agent Context

Operational context for AI coding agents working in this repo.

## Quick Reference

- **Stack**: React 19 + Vite 8 + Tailwind 4 (client) · Express 5 + Supabase (server)
- **Language**: JavaScript (JSX), no TypeScript
- **Package manager**: npm (no workspaces — client and server are independent)

## Commands

```bash
# Client
cd client && npm run dev      # Vite dev server → :5173
cd client && npm run build    # Production build
cd client && npm run lint     # ESLint

# Server
cd server && npm run dev      # nodemon → :3001
cd server && npm test         # Jest
```

## Architecture

```
client/src/
  App.jsx                 # Main component
  main.jsx                # Entry point
  index.css               # Tailwind styles
  assets/                 # Static assets
  lib/                    # Client utilities (empty)

server/src/
  index.js                # Server entry, middleware, health check
  lib/
    mealPlanBuilder.js    # Edamam API integration
    supabaseClient.js     # Supabase client init
  middleware/
    auth.js               # Auth middleware
  routes/
    mealplans.js          # POST /api/meal-plans — generate + cache meal plans
```

## Conventions

- **JSX files only** — use `.jsx` extension, not `.js`, for React components
- **Flat ESLint config** — `eslint.config.js` format, not `.eslintrc`
- **Tailwind CSS 4** — via `@tailwindcss/vite` plugin, not PostCSS
- **Express 5** — not v4; async errors are caught automatically
- **Supabase client** — always import from `server/src/lib/supabaseClient.js`

## Environment Variables (server/.env)

```
PORT=3001
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
EDAMAM_APP_ID=your_edamam_app_id
EDAMAM_APP_KEY=your_edamam_app_key
CLIENT_URL=http://localhost:5173
```

## Gotchas

- Client (:5173) and server (:3001) run on **separate ports** — CORS is configured for this
- Edamam API calls are **server-side only** — never expose API keys to the client
- Meal plans are **cached in Supabase** to avoid redundant API calls
- **No client tests yet** — only server has Jest configured
- **Supabase service role key** — `SUPABASE_SERVICE_ROLE_KEY` bypasses Row Level Security; the server has full admin access to the database
- `.env` is gitignored — never commit secrets
- No root `package.json` — `npm install` must be run in `client/` and `server/` separately

# Deploy

Production topology, the order to bring it up, and the things that break.
URLs below are placeholders — replace them with your real values as you deploy.

## Topology

| Piece | Host | Type | Why |
|---|---|---|---|
| `client/` | Vercel | Static build (`dist/`) | Pure static assets, built and served from Vercel's CDN |
| `server/` | Render | Web Service (long-running Node) | Express must stay alive to serve routes and call Edamam — it cannot run as a static build |
| Database + Auth | Supabase | Managed Postgres | Stores `meal_plans`, verifies JWTs |
| Meal plans | Edamam | External API | Called server-side only |

## Platform Configuration

Neither app has a root `package.json`, so **both platforms need an explicit Root
Directory**. Without it the build runs from the repo root and fails.

### Render — `server/`

| Setting | Value |
|---|---|
| Root Directory | `server` |
| Build Command | `npm install` |
| Start Command | `npm start` |
| Health Check Path | `/health` |

`PORT` needs no configuration — `server/src/index.js` reads `process.env.PORT`, which
Render injects.

### Vercel — `client/`

| Setting | Value |
|---|---|
| Root Directory | `client` |
| Framework Preset | Vite |
| Build Command | `npm run build` |
| Output Directory | `dist` |

## Environment Variables

Scope matters, and the two platforms differ:

- **Vercel** inlines `VITE_*` values at **build time** — changing one requires a
  **rebuild**, not a restart.
- **Render** reads values at **runtime** — changing one requires only a **restart**.

### Render (runtime)

```
PORT=                      # injected by Render
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
EDAMAM_APP_ID=
EDAMAM_APP_KEY=
CLIENT_URL=                # the Vercel production URL
```

### Vercel (build time)

```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_API_URL=              # the Render service URL
```

The anon key is **meant** to be public — it ships inside the client bundle. The service
role key must exist only on Render.

## Deploy Order

Each platform needs the other's URL, so deploy in this order:

1. **Render first.** Deploy `server/` and set its variables, leaving `CLIENT_URL` as a
   placeholder. Note the assigned URL, e.g. `https://meal-planner-api.onrender.com`.
2. **Then Vercel.** Deploy `client/` with `VITE_API_URL` set to the Render URL, plus the
   two Supabase values. Note the assigned URL.
3. **Return to Render** and set `CLIENT_URL` to the Vercel URL. Restart the service.
4. **Verify.**

Skipping step 3 is the most common mistake. The client loads normally and every API call
fails with a CORS error that looks like a frontend bug.

## Supabase Setup

The `meal_plans` table is **not in this repo** — it was created by hand in the Supabase
dashboard, so any new environment needs it recreated.

| Column | Type | Notes |
|---|---|---|
| `user_id` | `uuid` | `req.user.id` from the verified JWT |
| `days` | `integer` | requested day count |
| `meals_included` | `text[]` or `jsonb` | requested meal names |
| `health_labels` | `text[]` or `jsonb` | empty array when none requested |
| `plan_data` | `jsonb` | raw Edamam `/select` response |

> **Confirm these types against your development project before recreating the table.**
> They are inferred from how the server uses each column, not read from a migration —
> there is no migration in this repo.

Row Level Security is bypassed because the server connects with the service role key. If
the client is ever changed to read `meal_plans` directly with the anon key, RLS policies
must be added first.

## Known Footguns

- **Vercel preview deployments will fail CORS.** `CLIENT_URL` accepts a single origin,
  but every preview deployment gets a unique URL. Previews are effectively UI-only until
  the server is changed to accept a list of origins.
- **Render's free tier sleeps.** An idle service is spun down, so the next request is
  slow and can look like a failed deploy.
- **Edamam's free plan allows 10 account users per month.** The server sends one fixed
  `Edamam-Account-User` for every request (see [Architecture](Architecture.md)), so all
  production traffic shares that single allowance.
- **The deployed server has full admin access to Supabase.** Point it at a dedicated
  project rather than one you also use for throwaway experiments.

## Verification

```bash
curl https://<render-url>/health
# → { "status": "Okay!" }
```

Then open the Vercel URL and confirm an authenticated `POST /api/meal-plans` succeeds. A
CORS failure there means step 3 of the deploy order was missed.

## Rollback

Both platforms retain previous deployments: Vercel rolls back instantly to an earlier
build, and Render can redeploy a previous commit. Because the client inlines its
configuration at build time, rolling the client back also restores the environment it
was originally built with.

## Related

- [Architecture](Architecture.md) — request flow, database schema, external services
- [AGENTS.md](../AGENTS.md) — commands and gotchas

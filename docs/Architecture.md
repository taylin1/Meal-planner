# Architecture

How the pieces fit together and what actually happens on a request. For commands and
conventions see [AGENTS.md](../AGENTS.md); for setup see [README.md](../README.md).

## Directory Layout

```
client/src/
  App.jsx                 # Placeholder component ("Hello World")
  main.jsx                # Entry point — mounts App into #root
  index.css               # Tailwind styles
  assets/                 # Static assets
  lib/                    # Client utilities (empty)

server/src/
  index.js                # Entry point — dotenv, CORS, JSON parser, routes, /health
  lib/
    mealPlanBuilder.js    # Builds the Edamam /select request body
    supabaseClient.js     # Supabase admin client (service role key)
  middleware/
    auth.js               # verifyToken — Supabase JWT check
  routes/
    mealplans.js          # POST /api/meal-plans
```

## Request Flow — `POST /api/meal-plans`

1. **Auth.** `verifyToken` (`middleware/auth.js`) reads `Authorization: Bearer <jwt>`,
   asks Supabase `auth.getUser(token)` who the token belongs to, and attaches the user
   to `req.user`. Missing or invalid token → `401`, and the handler never runs.
2. **Parse.** The handler destructures `{ days, meals, healthLabels }` from the body.
3. **Build.** `buildMealPlanRequest()` (`lib/mealPlanBuilder.js`) maps each selected meal
   to an Edamam section, applying fixed calorie ranges and dish/meal-type filters.
   Health labels are only sent when non-empty — an empty array makes Edamam reject
   the request.
4. **Call Edamam.** The server POSTs to
   `https://api.edamam.com/api/meal-planner/v1/{APP_ID}/select` using HTTP Basic auth.
   A fixed `Edamam-Account-User` header is sent for every request because the free tier
   allows only 10 account users per month.
5. **Cache.** A non-2xx response from Edamam becomes `502`. On success the plan is
   inserted into `meal_plans` and returned as `201`.
6. **Not implemented.** Step 6 of the handler — `attachRecipeDetails()` — would expand
   each recipe URI into label, image, calories, ingredients, and source URL by fetching
   `/recipes/v2` in parallel. The function is written but never called (the code marks it
   "Phase 7"), so `plan_data` currently holds URIs rather than recipes.

## Database

`meal_plans` is written with the service role key, so **Row Level Security is bypassed**
by design — the server has full admin access.

| Column | Source |
|---|---|
| `user_id` | `req.user.id` from the verified token |
| `days` | requested day count |
| `meals_included` | requested meal names |
| `health_labels` | requested labels (empty array when none) |
| `plan_data` | raw Edamam `/select` response |

## External Services

- **Edamam Meal Planner v1** — `/select` only. The `/recipes/v2` lookups belong to the
  unimplemented detail step. Credentials: `EDAMAM_APP_ID`, `EDAMAM_APP_KEY`.
- **Supabase** — Postgres for storage plus Auth for token verification. The server
  disables `autoRefreshToken` and `persistSession` because it verifies other people's
  tokens rather than holding a session of its own.

## API Surface

Endpoint reference lives in the [README](../README.md#api-endpoints) so there is only
one copy to keep current.

## Client

Not built out yet. `App.jsx` renders a placeholder, and `react-router-dom` and
`@supabase/supabase-js` are installed but not wired to anything.

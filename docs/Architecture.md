# Architecture

How the pieces fit together and what actually happens on a request. For commands and
conventions see [AGENTS.md](../AGENTS.md); for setup see [README.md](../README.md).

## Directory Layout

```
client/src/
  App.jsx                 # Routes: /login, /signup, protected /dashboard
  main.jsx                # Entry point — mounts App into #root
  index.css               # Tailwind styles
  assets/                 # Static assets
  Components/             # Navbar, PlanBuilder, PlanPreview, SavedPlans, QuestionBar, DisplayAnswer
  Pages/                  # LoginPage, SignUpPage, Dashboard
  lib/                    # Supabase client, meal-plans API, plan options, local Qwen3 model

server/src/
  index.js                # Entry point — dotenv, CORS, JSON parser, routes, /health
  lib/
    mealPlanBuilder.js    # Builds the Edamam /select request body
    supabaseClient.js     # Supabase admin client (service role key)
  middleware/
    auth.js               # verifyToken — Supabase JWT check
  routes/
    mealplans.js          # POST / GET / DELETE /api/meal-plans
```## Request Flow — `POST /api/meal-plans`

1. **Auth.** `verifyToken` (`middleware/auth.js`) reads `Authorization: Bearer <jwt>`,
   asks Supabase `auth.getUser(token)` who the token belongs to, and attaches the user   to `req.user`. Missing or invalid token → `401`, and the handler never runs.
2. **Validate.** `parsePlanInput()` (`lib/mealPlanBuilder.js`) checks `days` (1–7),   `meals` (a non-empty subset of Breakfast/Lunch/Dinner), and `healthLabels` (at most   one, from a fixed allowlist). Bad input → `400` before Edamam is called.
3. **Build.** `buildMealPlanRequest()` (`lib/mealPlanBuilder.js`) maps each selected meal   to an Edamam section, applying fixed calorie ranges and dish/meal-type filters.   Health labels are only sent when non-empty — an empty array makes Edamam reject   the request.
4. **Call Edamam.** The server POSTs to   `https://api.edamam.com/api/meal-planner/v1/{APP_ID}/select` using HTTP Basic auth.   A fixed `Edomam-Account-User` header is sent for every request because the free tier   allows only 10 account users per month.
5. **Edamam errors.** A non-2xx response becomes `502`; an empty `selection` becomes   `422` with a "try different options" message.
6. **Expand.** `attachRecipeDetails()` turns each select link into label, image,   per-serving calories, ingredients, and source URL, one request at a time.   `plan_data` stores that expanded shape as an array of `{ sections }`, one entry per   day in plan order.
7. **Save.** The row is inserted into `meal_plans` with `user_id` and the requested   choices, then returned as `201`.## Request Flow — Ask a question (browser only)

1. **QuestionBar** (`client/src/Components/QuestionBar.jsx`) captures the user's input
   and calls `Dashboard.handleAsk(question)`. Ask stays disabled until the model is ready.
2. **Topic guard** (`client/src/lib/foodHealthGuard.js`) tests the question against a
   whole-word food/health keyword list (`FOOD_HEALTH_PATTERN`). Non-food questions
   (e.g. weather, politics) throw "Please ask a food or health related question.".
3. **Model load** (`client/src/lib/qvacModel.js`) creates one WebLLM engine for the tab
   with `Qwen3-0.6B-q4f16_1-MLC`. `hasModelInCache()` decides whether this is a first
   download or a cached load, and `initProgressCallback` drives the percentage shown in
   the ask card.
4. **Inference** runs in `client/src/lib/qvacWorker.js`, so the page never freezes.
   The prompt keeps the same system message and appends `/no_think`; the request also
   sets `enable_thinking: false`.
5. **Answer.** Thinking tags are stripped and an empty reply throws. `DisplayAnswer`
   renders the text in its existing card, or shows the error card.

No Supabase JWT is involved and no request reaches Express. The weights are fetched
once from the Hugging Face CDN, then served from the browser cache, which is what makes
the ask bar work offline after the first successful load.

## Request Flow — `POST /api/meal-plans`

1. **Auth.** `verifyToken` (`middleware/auth.js`) reads `Authorization: Bearer <jwt>`,   asks Supabase `auth.getUser(token)` who the token belongs to, and attaches the user   to `req.user`. Missing or invalid token → `401`, and the handler never runs.
2. **Validate.** `parsePlanInput()` (`lib/mealPlanBuilder.js`) checks `days` (1–7),   `meals` (a non-empty subset of Breakfast/Lunch/Dinner), and `healthLabels` (at most   one, from a fixed allowlist). Bad input → `400` before Edamam is called.
3. **Build.** `buildMealPlanRequest()` (`lib/mealPlanBuilder.js`) maps each selected meal   to an Edamam section, applying fixed calorie ranges and dish/meal-type filters.   Health labels are only sent when non-empty — an empty array makes Edamam reject   the request.
4. **Call Edamam.** The server POSTs to   `https://api.edamam.com/api/meal-planner/v1/{APP_ID}/select` using HTTP Basic auth.   A fixed `Edamam-Account-User` header is sent for every request because the free tier   allows only 10 account users per month.
5. **Edamam errors.** A non-2xx response becomes `502`; an empty `selection` becomes   `422` with a "try different options" message.
6. **Expand.** `attachRecipeDetails()` turns each select link into label, image,   per-serving calories, ingredients, and source URL, one request at a time.   `plan_data` stores that expanded shape as an array of `{ sections }`, one entry per   day in plan order.
7. **Save.** The row is inserted into `meal_plans` with `user_id` and the requested   choices, then returned as `201`.

## Database

`meal_plans` is written with the service role key, so **Row Level Security is bypassed**
by design — the server has full admin access.

| Column | Source |
|---|---|
| `user_id` | `req.user.id` from the verified token |
| `days` | requested day count |
| `meals_included` | requested meal names |
| `health_labels` | requested labels (empty array when none) |
| `plan_data` | expanded recipe details, one `{ sections }` entry per day |

## External Services

- **Edamam Meal Planner v1** — `/select` plus one recipe lookup per selected meal for
  details. Credentials: `EDAMAM_APP_ID`, `EDAMAM_APP_KEY`.
- **Hugging Face (MLC weights)** — the browser downloads `Qwen3-0.6B-q4f16_1-MLC` on the
  first ask-bar load. Only that first load is online; the browser caches the weights.
- **Supabase** — Postgres for storage plus Auth for token verification. The server
  disables `autoRefreshToken` and `persistSession` because it verifies other people's
  tokens rather than holding a session of its own.

## API Surface

Endpoint reference lives in the [README](../README.md#api-endpoints) so there is only
one copy to keep current.

## Client

`App.jsx` wires `react-router-dom` (public `/login` and `/signup`, protected
`/dashboard` via `ProtectedRoute`). `Dashboard.jsx` fetches the user's plans from
`GET /api/meal-plans` and renders `PlanBuilder` (POSTs the choices), `PlanPreview`
(the generated or viewed plan), and `SavedPlans` (view + delete).
`lib/mealPlansApi.js` attaches the Supabase access token and turns non-2xx responses
into errors the cards display. `lib/qvacModel.js` loads and runs the Qwen3 model in a
Web Worker, so the ask bar needs no server endpoint.

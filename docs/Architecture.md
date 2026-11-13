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
  Components/             # Navbar, PlanBuilder, PlanPreview, SavedPlans
  Pages/                  # LoginPage, SignUpPage, Dashboard
  lib/                    # Supabase client, meal-plans API, plan options

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
7. **Save.** The row is inserted into `meal_plans` with `user_id` and the requested   choices, then returned as `201`.

## Request Flow — `POST /api/meal-plans/ask`

1. **QuestionBar** (`client/src/Components/QuestionBar.jsx`) captures the user's input   and calls `Dashboard.handleAsk(question)`.
2. **`askQuestion`** (`client/src/lib/mealPlansApi.js`) sends `POST /api/meal-plans/ask`   with a Bearer JWT from the Supabase session.
3. **`verifyToken`** (`middleware/auth.js`) validates the JWT; 401 if missing/invalid.
4. **Topic guard** (`server/src/routes/askquestion.js`) tests the question against a   whole-word food/health keyword list (`FOOD_HEALTH_PATTERN`). Non-food questions   (e.g. weather, politics) receive `400` "Please ask a food or health related question.".
5. **Model ready check** (`server/src/lib/qvacModel.js`) returns the singleton `modelId`;   if the model is still loading, the response is `503` "Model is still loading. Please try   again in a moment.".
6. **Completion.** `completion({ modelId, history, captureThinking: true })` from the   `@qvac/sdk` generates an answer. The prompt appends `/no_think` to skip the model's
   internal reasoning block, and `captureThinking` separates clean prose (`contentText`)
   from raw thinking tokens. This drops a local CPU answer from ~17s to ~2s.
7. **Answer returned.** The server returns `{ answer: '<clean text>' }` to the client.
8. **DisplayAnswer** (`client/src/Components/DisplayAnswer.jsx`) renders the text,
   replacing the skeleton loader, or shows an error card if something failed.

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
into errors the cards display.

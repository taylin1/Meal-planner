# Create My Plan (parts 2 + 8)

Source: `docs/dashboard-mockup.png` — callout 2 ("Create your plan") and callout 8
("Saved plans"). Visual rules: `docs/design.md`.

## Goal

A logged-in user on `/dashboard` picks a number of days, which meals to include, and a
diet, presses **Generate plan**, and receives an Edamam-generated plan from
`POST /api/meal-plans`. The generated plan appears in a plain result panel and is added
to a **Saved plans** list (newest first) that can be viewed again or deleted.

## Decisions (confirmed with the user)

| Question | Decision |
|---|---|
| Diet chips | **Single-select.** Clicking the selected chip deselects it (no diet filter). |
| Low-carb chip | **Replaced.** Edamam has no `low-carb` *health* label, so the chip is replaced by **Paleo** (`paleo`). |
| Scope | **Builder + saved plans.** Saved plans list is included, so `DELETE /api/meal-plans/:id` is added. |

## Chip → Edamam mapping

The client sends canonical Edamam label keys; the server validates against this exact
allowlist. Invalid keys are a `400`, never a silently ignored filter.

| UI chip | Value sent | Notes |
|---|---|---|
| Vegetarian | `vegetarian` | |
| Vegan | `vegan` | |
| Keto | `keto-friendly` | Edamam's label is `keto-friendly`, not `keto` |
| Gluten-free | `gluten-free` | |
| Dairy-free | `dairy-free` | |
| Paleo | `paleo` | Replacement for Low-carb |
| Peanut-free | `peanut-free` | |

Meals: `Breakfast`, `Lunch`, `Dinner` (existing `mealPlanBuilder.js` keys).
Days: integers `1`–`7`.

## Scope

In scope:
- Builder card (days, meals, diet, inline error, Generate).
- Client → API wiring with the Supabase access token.
- A **minimal** result panel (day heading, day kcal total, meal name + kcal).
- Saved plans list: fetch, title/subtitle, View, delete.

Out of scope (part 3 and later):
- Day tabs, calorie donut, recipe accordion, ingredients, images, "View full recipe".
- Editing an existing plan, per-meal calorie ranges, user-configurable nutrition targets.
- Parallelising `attachRecipeDetails()` (see Risks).
- Any new dependency.

## Backend

### Files

- `server/src/lib/mealPlanBuilder.js` — add `HEALTH_LABELS` allowlist and
  `parsePlanInput(body)`.
- `server/src/routes/mealplans.js` — use `parsePlanInput` in `POST`, add `DELETE /:id`.

### `parsePlanInput(body)` → `{ error }` or `{ value: { days, meals, healthLabels } }`

Pure function, no I/O, so it is unit-testable without mocks. Rules:

- `days`: required, `Number.isInteger`, `1 <= days <= 7`. Anything else →
  `"Days must be a whole number from 1 to 7"`.
- `meals`: required array, non-empty, no duplicates, every entry in
  `['Breakfast', 'Lunch', 'Dinner']` → otherwise
  `"Pick at least one meal: Breakfast, Lunch or Dinner"` or
  `"One of those meals is not supported"`.
- `healthLabels`: optional array, at most one entry (single-select UI), entry must be in
  the allowlist → otherwise `"That diet is not supported"`. Missing/empty → `[]`.
- Unknown body fields are ignored.
- Returns normalized values only (never echoes unknown input into the Edamam request).

`buildMealPlanRequest()` stays as-is: it already omits the `accept` block when
`healthLabels` is empty (an empty array makes Edamam reject the request) and builds one
section per selected meal with the fixed per-meal calorie ranges.

### `POST /api/meal-plans` (verifyToken)

Request:

```json
{ "days": 3, "meals": ["Breakfast", "Lunch"], "healthLabels": ["vegetarian"] }
```

Behavior: validate → build → Edamam `/select` → `attachRecipeDetails()` → insert →
return the saved row. Unchanged apart from validation.

Responses:

| Status | Body | When |
|---|---|---|
| `201` | saved `meal_plans` row | success |
| `400` | `{ error }` from `parsePlanInput` | bad days/meals/diet |
| `401` | `{ error: 'No token provided' \| 'Invalid token' }` | existing middleware |
| `422` | `{ error: 'Could not build a plan with those choices. Try different options.' }` | Edamam returned an empty selection |
| `502` | `{ error: 'Failed to generate meal plan' }` | Edamam non-2xx |
| `500` | `{ error: ... }` | Supabase insert or unexpected failure |

### `GET /api/meal-plans` (verifyToken)

Unchanged: all of the user's plans, `created_at` descending, `200` + array.

### `DELETE /api/meal-plans/:id` (verifyToken)

1. Reject a non-UUID `:id` → `400 { error: 'Invalid plan id' }` (guards the Postgres
   `22P02` cast error, which would otherwise surface as a `500`).
2. `.from('meal_plans').delete().eq('id', id).eq('user_id', req.user.id).select('id')`
   — scoping by `user_id` is what stops one user deleting another's plan.
3. `0` rows → `404 { error: 'Plan not found' }`; DB error → `500`; success → `204` with
   no body.

### Stored `plan_data` shape (already produced today)

```json
[
  { "sections": {
      "Breakfast": { "label": "Berry oat bowl", "image": "...", "calories": 420,
                     "ingredientLines": ["..."], "url": "https://..." },
      "Lunch": { "label": "Chickpea and spinach salad", "calories": 640 }
  } }
]
```

Array index + 1 is the day number. Day kcal total is summed client-side. Do not change
this shape — part 3 will read it.

## Frontend

### Files

| File | Purpose |
|---|---|
| `client/src/lib/planOptions.js` | `DAYS`, `MEALS`, `DIETS` (`{ label, value }`) + `planTitle(plan)` helper |
| `client/src/lib/mealPlansApi.js` | `generateMealPlan`, `fetchMealPlans`, `deleteMealPlan` |
| `client/src/Components/PlanBuilder.jsx` | Card 2 |
| `client/src/Components/PlanPreview.jsx` | Minimal result panel |
| `client/src/Components/SavedPlans.jsx` | Card 8 |
| `client/src/Pages/Dashboard.jsx` | Composes the three; owns plan state |
| `client/.env.example` | Add `VITE_API_URL=http://localhost:3001` |

`mealPlansApi.js` reads the token with `supabase.auth.getSession()` at call time (not at
module load), and calls `${import.meta.env.VITE_API_URL || 'http://localhost:3001'}`.
Non-2xx responses throw an `Error` carrying the server's `error` message, so components
show real server copy rather than a generic string. `204` from delete resolves without
parsing JSON.

### Dashboard state

`plans` (array), `selectedPlan` (object or `null`), `plansLoading`, `plansError`.
Fetch saved plans on mount (after the auth check in `ProtectedRoute` has passed). On
`201`, prepend the returned row to `plans` and set it as `selectedPlan`.

Layout: `bg-gray-50` page, `max-w-5xl`, `gap-6`; builder in a `lg:grid-cols-[320px_1fr]`
grid next to the preview; Saved plans full width below. Navbar is unchanged.

### PlanBuilder (callout 2)

- Title `Create your plan` (`text-2xl font-bold`), subtitle `Pick your days, meals and
  diet` (`text-sm text-gray-500`).
- **Number of days**: pills 1–7, single-select, `rounded-full`, selected
  `bg-orange-500 text-white`, unselected `bg-gray-100`. Default `3`.
- **Meals**: Breakfast / Lunch / Dinner toggles (multi-select), same pill styling.
  Default `['Breakfast', 'Lunch']` (matches the mockup).
- **Diet**: chips from the mapping table, single-select with a leading `✓` on the
  selected chip and an orange ring/border. Default `vegetarian`.
- **Error**: when Generate is pressed with no meals selected, show
  `Pick at least one meal` in a `bg-red-50 text-red-500 rounded-2xl border border-dashed
  border-red-300` box and **do not call the API**. Clear it on the next valid press.
  Server `400`/`422`/`502` messages render in the same box.
- **Generate plan**: full-width orange `rounded-full` button, `disabled` while loading,
  label `Generating...` while in flight (a plan with 3 days × 2 meals is ~6 sequential
  Edamam recipe lookups, so this can take several seconds — keep the button disabled,
  no timeout).

### PlanPreview (minimal, part 3 will replace it)

- Title `Your plan`; right-side meta `${days} days` and the diet label or `No diet
  filter`.
- Empty state: `Generate a plan or view a saved one.`
- For each day: `Day N` heading, `N kcal` day total, then one row per meal with the
  recipe label and `X kcal`. No tabs, donut, accordion, ingredients, or images.

### SavedPlans (callout 8)

- Title `Saved plans`, `Newest first` on the right; `text-sm text-gray-500` empty state
  `No saved plans yet`; loading state `Loading plans...`.
- Row title from `planTitle(plan)`:
  - all three meals → `${days} days of all meals`
  - otherwise `${days} days of ${meals_included.join(' and ').toLowerCase()}`
- Subtitle: diet label or `No diet filter`, then `, created 4 Nov` from `created_at`
  (`day: 'numeric', month: 'short'`).
- **View**: sets `selectedPlan`; outline-orange `rounded-full` button, `View` label.
- **X**: gray circle, `aria-label="Delete plan"`; `window.confirm('Delete this plan?')`
  (no dialog library), then `DELETE`. Remove the row on success; if the deleted plan was
  selected, clear the preview. Show failures in the list's error line.

## Tests

No new dependencies. Jest (server) picks up co-located `*.test.js` automatically; no
config file needed. Client has no runner — verification is lint + build.

`server/src/lib/mealPlanBuilder.test.js` (pure):
- one section per selected meal, with the correct dish/meal filters and calorie range
- `accept` block absent when `healthLabels` is empty, present with the mapped label
- `keto-friendly` mapping for the Keto chip
- `parsePlanInput` accepts `days: 1` and `7`; rejects `0`, `8`, `2.5`, `"3"`, `[]`
  meals, `['Snack']`, duplicate meals, `['low-carb']`, and two diet labels

`server/src/routes/mealplans.test.js` (mock `../lib/supabaseClient.js` with `jest.mock`
*before* requiring the router, stub `global.fetch`):
- `401` with no `Authorization` header
- `400` for bad days / no meals / unsupported diet
- `201` returns the saved row and inserts with `req.user.id` and the `user_id` filter
- `502` when Edamam `/select` is not ok; `422` when `selection` is empty
- `GET` returns the list; `500` on DB error
- `DELETE` → `204`; `404` when nothing matched; `400` for a non-UUID id; `401` unauthed

Commands:

```bash
cd server && npm test
cd client && npm run lint && npm run build
```

## Docs to update

- `README.md`: flip the "Client plan builder + plan display" row to reflect builder +
  saved plans (plan display still pending), and note `VITE_API_URL`.
- `AGENTS.md`: its "Known Incomplete" section still says `attachRecipeDetails()` is
  never called, which the code contradicts; fix that line while nearby.

## Acceptance criteria

1. `/dashboard` renders the builder card, preview panel, and saved plans, styled per
   `docs/design.md` (gray-50 page, white `rounded-3xl` cards, orange accents, pill
   controls).
2. Day/meal/diet selections produce exactly the documented request body; diet is
   single-select and deselectable.
3. Generate with no meals shows the inline error and sends no request.
4. Successful generation renders the plan in the preview and prepends it to Saved plans.
5. A reload lists the same plan from `GET /api/meal-plans`, newest first.
6. View restores a saved plan to the preview; delete removes it after confirmation and
   survives a reload.
7. A second user's plan can never be read or deleted through these endpoints.
8. `npm test` (server) passes; `npm run lint` and `npm run build` (client) pass.

## Risks / notes

- **Generation is slow**: `attachRecipeDetails()` awaits each recipe link in nested
  loops (~20 serial HTTP calls for a full week). Acceptable for this feature because the
  button has a loading state; parallelising with `Promise.all` is a follow-up.
- **Edamam free tier** allows 10 account users/month and all traffic shares one fixed
  `Edamam-Account-User`; heavy use can return `502`.
- **Diet filters can make a plan impossible** (e.g. Paleo + breakfast dish types).
  Edamam answers `422`, which the builder surfaces verbatim.
- **CORS**: the server accepts only `CLIENT_URL`; a missing/incorrect value blocks every
  request from `:5173`. `VITE_API_URL` must point at the server origin.

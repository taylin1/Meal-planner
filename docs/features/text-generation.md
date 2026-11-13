# Feature Spec: Question Bar & AI Answer Display

## Overview

Logged-in users can type a food- or health-related question into a Question Bar on the
Dashboard. The server calls a local Qvac model (`QWEN3_600M_INST_Q4`) and streams the
answer back. The answer is shown beside the Question Bar in `DisplayAnswer.jsx`.

---

## Layout

The Question Bar and Display Answer are placed **between the plan grid (PlanBuilder /
PlanPreview) and the SavedPlans section** in `Dashboard.jsx`, matching the existing
two-column grid pattern:

```
Navbar
─────────────────────────────────────────────
PlanBuilder  │  PlanPreview          ← existing grid
─────────────────────────────────────────────
QuestionBar  │  DisplayAnswer        ← new row (this feature)
─────────────────────────────────────────────
SavedPlans
Footer
```

On mobile (`grid-cols-1`) both sections stack vertically: QuestionBar first, then
DisplayAnswer below it.

---

## Scope

| In scope | Out of scope |
|---|---|
| Single question → single answer cycle | Conversation / chat history |
| Food & health topic guard (server-side) | General-purpose Q&A |
| Loading state while model runs | Streaming token-by-token display |
| Error message on failure | Retry logic |
| Dismiss checkbox | **Deferred** — not built in this iteration |

---

## Backend

### New dependency

`@qvac/sdk` is added to `server/package.json`. No client-side dependency is added —
API keys and model weights never reach the browser.

### Model lifecycle — `server/src/lib/qvacModel.js`

```
loadModel({ modelSrc: QWEN3_600M_INST_Q4, modelConfig: { device: 'cpu' } })
```

Called **once at server startup** in `server/src/index.js` (after `dotenv.config()`).
`modelId` is stored in the module and exported as `getModelId()`. All requests reuse
this single loaded model instance.

### Route — `server/src/routes/askquestion.js`

**Already mounted** in `index.js` at `/api/meal-plans` (existing line). The route
exposes one endpoint:

```
POST /api/meal-plans/ask
```

| | |
|---|---|
| Auth | `verifyToken` middleware (existing) |
| Request body | `{ question: string }` |
| Response (200) | `{ answer: string }` |
| Response (400) | `{ error: "Please ask a food or health related question." }` |
| Response (503) | `{ error: "Model is still loading. Please try again in a moment." }` |
| Response (500) | `{ error: "Could not generate an answer. Please try again." }` |

#### Topic guard

Before calling the model the handler checks that the question contains at least one
keyword from a food/health allow-list (nutrition words like `food`, `meal`, `diet`,
`calorie`, `protein`, `carb`, `fat`, `vitamin`, `health`, `weight`; common foods like
`chicken`, `beef`, `egg`, `rice`, `bread`, `cheese`, `banana`, `apple`; and health topics
like `calcium`, `iron`, `metabolism`, `diabetes`, `blood sugar`, etc.).

The check is a **whole-word** regex match (`\b…\b`, plus a regular plural), not a plain
substring: `eat` must not match `weather`, while a food name alone (`is chicken good for
me?`) is enough to pass. Whole-word matching also means typos in the *other* words are
harmless, since the food name still matches.

If no keyword matches → **400** with the topic-guard message above.

This is a simple string check — no second model call.

#### Prompt sent to Qvac

A `system` message plus the user question, passed as `history`:

```
system: You are a helpful nutrition and health assistant. Only answer questions
        about food, diet, nutrition, and health. Answer clearly and concisely in
        2–4 sentences.
user:   <user question> /no_think
```

#### Model call

```js
const { loadModel, completion, QWEN3_600M_INST_Q4 } = require('@qvac/sdk')

// startup
modelId = await loadModel({
  modelSrc: QWEN3_600M_INST_Q4,
  modelConfig: { device: 'cpu' },
})

// per request — completion() is synchronous and returns a CompletionRun,
// it is NOT awaited and does NOT take a prompt string.
const run = completion({
  modelId,
  history,
  stream: true,
  captureThinking: true, // splits  thinking output from the real answer
})
const answer = (await run.final).contentText
```

Qwen3 is a hybrid reasoning model: without `captureThinking` the reply contains the
raw ` thinking…</think>` block. The user turn also gets a `/no_think` suffix, which
skips reasoning entirely (~2 s instead of ~17 s per answer on CPU).

---

### Mount fix in `server/src/index.js`

The existing mount line has a typo (`/routes/askquestion.js` — absolute path).
Fix to a relative require:

```js
// before (broken)
const askQuestionRoute = require('/routes/askquestion.js')

// after
const askQuestionRoute = require('./routes/askquestion.js')
```

The route is already mounted at `/api/meal-plans` — the endpoint becomes
`POST /api/meal-plans/ask`. No change needed to the mount line itself.

---

### Tests — `server/src/routes/askquestion.test.js`

| Test | Expected |
|---|---|
| No auth token | 401 |
| Valid token, off-topic question | 400 + topic-guard message |
| Valid token, food question, model returns text | 200 + `{ answer: string }` |
| Valid token, model not yet loaded (`modelId` is null) | 503 |
| Missing `question` field in body | 400 |

The test file mocks `@qvac/sdk` (`jest.mock`) and the `verifyToken` middleware so no
real model weights are needed in CI.

---

## Frontend

### `client/src/lib/mealPlansApi.js` — new export

```js
export async function askQuestion(question) {
  const response = await callApi('/api/meal-plans/ask', {
    method: 'POST',
    body: JSON.stringify({ question }),
  })
  return response.json()   // { answer: string }
}
```

Uses the existing `callApi` helper (auth headers, error handling, API_URL).

---

### `client/src/Components/QuestionBar.jsx`

Props: `onAsk(question)`, `loading`

Renders (design.md tokens throughout):

- Card: `bg-white rounded-3xl p-6 shadow-sm`
- Title: `text-2xl font-bold text-gray-900` — "Ask a question"
- Subtitle: `text-sm text-gray-500` — "Food and health questions only"
- `<textarea>` (or `<input>`): `bg-gray-100 rounded-full px-4 py-2 text-sm w-full`
  — placeholder: `"e.g. How much protein does chicken have?"`
- Submit button: `bg-orange-500 hover:bg-orange-600 text-white rounded-full px-6 py-2 text-sm`
  — label: "Ask" — disabled and shows "Asking…" while `loading` is true
- Pressing Enter (without Shift) submits the form

Named function declaration (`function QuestionBar`), no arrow functions (design.md rule).

---

### `client/src/Components/DisplayAnswer.jsx`

Props: `answer`, `loading`, `error`

States:

| State | What renders |
|---|---|
| `loading` true | Spinner or pulsing placeholder (`animate-pulse bg-gray-100 rounded-2xl`) |
| `error` set | `text-red-500` message on `bg-red-50 rounded-2xl p-4` |
| `answer` set | Answer text in card — `bg-white rounded-3xl p-6 shadow-sm text-sm text-gray-900` |
| None of the above | Empty card with prompt text: `text-gray-500 text-sm` — "Your answer will appear here." |

Named function declaration (`function DisplayAnswer`).

---

### `client/src/Pages/Dashboard.jsx` changes

1. Import `QuestionBar`, `DisplayAnswer`, `askQuestion`.
2. Add state: `answer`, `answerLoading`, `answerError`.
3. Add handler `handleAsk(question)` — calls `askQuestion`, manages the three state
   values, catches errors.
4. Insert a new grid row between the plan grid and `<SavedPlans>`:

```jsx
<div className="grid grid-cols-1 gap-6 lg:grid-cols-[380px_minmax(0,1fr)]">
  <QuestionBar onAsk={handleAsk} loading={answerLoading} />
  <DisplayAnswer answer={answer} loading={answerLoading} error={answerError} />
</div>
```

The `minmax(0, 1fr)` column is preserved (see AGENTS.md gotcha).

---

## Environment variables

No new env vars. The Qvac model is bundled via the SDK; it needs no API key.

---

## Files changed / created

| File | Action |
|---|---|
| `server/package.json` | add `@qvac/sdk` dependency |
| `server/src/lib/qvacModel.js` | **new** — loadModel singleton |
| `server/src/routes/askquestion.js` | **fill in** — topic guard + completion call |
| `server/src/routes/askquestion.test.js` | **new** — 5 test cases |
| `server/src/index.js` | fix require path typo; call `startModel()` on startup |
| `client/src/lib/mealPlansApi.js` | add `askQuestion` export |
| `client/src/Components/QuestionBar.jsx` | **fill in** |
| `client/src/Components/DisplayAnswer.jsx` | **fill in** |
| `client/src/Pages/Dashboard.jsx` | add state, handler, new grid row |

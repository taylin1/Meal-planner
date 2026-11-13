# Feature Spec: Question Bar & AI Answer Display

## Overview

Logged-in users can type a food- or health-related question into a Question Bar on the
Dashboard. The model — `Qwen3-0.6B-q4f16_1-MLC`, run through WebLLM — runs **inside the
browser** in a Web Worker, so the answer never leaves the device and no server endpoint
is involved. The answer is shown beside the Question Bar in `DisplayAnswer.jsx`.

Both components were briefly hidden (`VITE_HIDE_QVAC`) because the model could not fit
on Render. Moving inference to the browser removed that constraint; the flag still works
as an opt-out.

---

## Layout

The Question Bar and Display Answer sit **between the plan grid (PlanBuilder /
PlanPreview) and the SavedPlans section** in `Dashboard.jsx`:

```
Navbar
─────────────────────────────────────────────
PlanBuilder  │  PlanPreview          ← existing grid
─────────────────────────────────────────────
QuestionBar  │  DisplayAnswer        ← ask row
─────────────────────────────────────────────
SavedPlans
```

On mobile (`grid-cols-1`) both sections stack vertically. Card classes are unchanged
from the original design (`bg-white rounded-3xl p-6 shadow-sm`, orange pill button,
`text-sm text-gray-500` subtitle).

---

## Scope

| In scope | Out of scope |
|---|---|
| Single question → single answer cycle | Conversation / chat history |
| Food & health topic guard (client-side) | General-purpose Q&A |
| Model download progress + loading state | Token-by-token streaming display |
| Error message on failure | Retry button |
| Offline use after the first successful load | Multi-model selection UI |

---

## Model

| | |
|---|---|
| Engine | `@mlc-ai/web-llm` (WebLLM) |
| Model id | `Qwen3-0.6B-q4f16_1-MLC` (same Qwen3 0.6B the server used) |
| Weights | ~350 MB, fetched once from the Hugging Face CDN |
| Cache | Browser cache (`hasModelInCache()` from WebLLM) → later loads are offline |
| Runtime | WebGPU only — Chrome/Edge. Unsupported browsers show a load error |
| Thread | `client/src/lib/qvacWorker.js` (`WebWorkerMLCEngineHandler`) |

`VITE_QVAC_MODEL_ID` overrides the model id; `client/.env.example` documents it.

---

## Request Flow (all in the browser)

1. `Dashboard` mounts and calls `loadQvacModel(onProgress)` unless `VITE_HIDE_QVAC=true`.
   `initProgressCallback` feeds the percentage shown under "Ask a question".
2. The user submits. `QuestionBar` refuses to submit until `modelStatus === 'ready'`.
3. `askQuestion(question)` in `client/src/lib/qvacModel.js`:
   - rejects an empty question with `Please provide a question.`
   - runs the topic guard from `client/src/lib/foodHealthGuard.js` — a whole-word match
     on a food/health keyword list, so `eat` does not match `weather`. Off-topic →
     `Please ask a food or health related question.`
   - calls `engine.chat.completions.create()` with the system prompt below
   - strips any ` thinking…</think>` block and rejects an empty answer
4. `DisplayAnswer` renders the answer or the red error card.

### Prompt

```
system: You are a helpful nutrition and health assistant. Only answer questions
        about food, diet, nutrition, and health. Answer clearly and concisely in
        2–4 sentences.
user:   <user question> /no_think
```

`enable_thinking: false` is also sent per request. Both switches skip Qwen3's reasoning
block, which keeps answers short and fast on a small GPU.

---

## Components

### `client/src/Components/QuestionBar.jsx`

Props: `onAsk(question)`, `loading`, `modelStatus`, `modelProgress`

- Subtitle reuses the original `text-sm text-gray-500` line:
  - loading → `Loading model… 62%` (or `Preparing the model…` at 0%)
  - error → `The model could not load. WebGPU is required — try Chrome or Edge.`
  - ready → `Food and health questions only`
- Textarea and card classes unchanged; the Ask button is disabled until ready.
- Enter (without Shift) submits.

### `client/src/Components/DisplayAnswer.jsx`

Unchanged. Props: `answer`, `loading`, `error`; skeleton while asking, red card on
error, plain prose when an answer exists.

### `client/src/Pages/Dashboard.jsx`

Adds `modelStatus` / `modelProgress` state, the load effect, and runs `handleAsk`
through the local `askQuestion`. Everything else (plan builder, preview, saved plans)
is untouched.

---

## Files

| File | Action |
|---|---|
| `client/package.json` | add `@mlc-ai/web-llm` |
| `client/src/lib/qvacModel.js` | **new** — engine singleton, prompt, askQuestion |
| `client/src/lib/qvacWorker.js` | **new** — WebLLM worker handler |
| `client/src/lib/foodHealthGuard.js` | **new** — topic guard moved from the server |
| `client/src/lib/mealPlansApi.js` | remove the old `askQuestion` fetch |
| `client/src/Pages/Dashboard.jsx` | model state + load effect + new props |
| `client/src/Components/QuestionBar.jsx` | status props, disabled until ready |
| `client/src/Components/DisplayAnswer.jsx` | unchanged |
| `client/vite.config.js` | exclude `@mlc-ai/web-llm` from dependency pre-bundling |
| `client/.env.example` | document `VITE_QVAC_MODEL_ID` |
| `server/src/lib/qvacModel.js` | **deleted** |
| `server/src/routes/askquestion.js` | **deleted** |
| `server/src/routes/askquestion.test.js` | **deleted** |
| `server/src/index.js` | remove model startup and `/ask` mount |
| `server/package.json` | remove `@qvac/sdk` |

---

## Trade-offs

- First load is a ~350 MB download; the card reports progress instead of hanging.
- Answers depend on WebGPU; browsers without it cannot use the ask bar at all.
- Cache is per browser profile and is cleared by "clear site data" (next load re-downloads).
- Mobile browsers with limited GPU memory may fail to load a 0.6B model.

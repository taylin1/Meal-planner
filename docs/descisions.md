## ADR-004: Store calories per serving

**Date:** 2026-10-29
**Status:** Accepted

**Context:**
Edamam's recipe calories are for the whole recipe, not one serving.
A loaf showed 4542 kcal, which is meaningless in a meal plan.

**Decision:**
Divide recipe calories by the recipe's yield (servings) before saving.
Default to 1 serving if yield is missing.

**Consequences:**
- Positive: Calories match what a person actually eats
- Negative: Depends on Edamam's yield being accurate

## ADR-005: Load Qvac model before starting the HTTP server

**Date:** 2026-11-13
**Status:** Superseded by ADR-006

**Context:**
The Qvac model (Qwen3 0.6B GGUF) takes ~40s to load from disk on CPU.
Originally `startModel()` was called after `app.listen()`, so the HTTP server
began accepting requests immediately. Any `/ask` request during the loading
window returned `503` "Model is still loading.", which appeared on Render
deploys where the ephemeral filesystem requires a full model re-download.

**Decision:**
Move `startModel()` to run **before** `app.listen()` in
`server/src/index.js`. This way the model loads before the server starts
accepting `/ask` requests, eliminating the immediate 503 window on deployment.
If the model takes longer than expected, the server simply won't accept food
questions until loading completes.

**Consequences:**
- Positive: No 503 errors right after deployment; users get answers immediately
  when the server is live.
- Negative: Server startup is slightly slower (model loading + all init before
  listening), but this is a one-time cost at boot, not per-request.
- Negative: If the model fails to load, the server starts in a degraded state
  where `/ask` always returns 503 until the process is restarted.

## ADR-006: Run the Qwen3 model in the browser with WebLLM

**Date:** 2026-11-14
**Status:** Accepted — supersedes ADR-005

**Context:**
The Qvac model could not be deployed: Render has no room for ~380 MB of weights plus
1.6 GB of SDK/native addons, so the ask bar was hidden in `Dashboard.jsx`. The
`@qvac/sdk` cannot run in a browser (it spawns a Bare worker and loads a native
llama.cpp addon), so "move it to the frontend" cannot keep the Qvac runtime.

**Decision:**
Run the same Qwen3 0.6B family in the browser with **WebLLM**
(`@mlc-ai/web-llm`) using `Qwen3-0.6B-q4f16_1-MLC`. Inference lives in a Web Worker
(`client/src/lib/qvacWorker.js`), the model is fetched once from Hugging Face and
cached by the browser, and the server loses the model, the `/ask` route, its tests,
and the `@qvac/sdk` dependency. The topic guard, system prompt and `/no_think`
behaviour move to `client/src/lib/` unchanged.

**Consequences:**
- Positive: no model weights or model runtime on Render, so deploys fit and startup
  is fast; ADR-005's 503 window disappears with the endpoint.
- Positive: works offline after the first load; questions never leave the browser.
- Negative: requires WebGPU (Chrome/Edge) — other browsers get a load error.
- Negative: first load downloads ~350 MB, and answers are slower than the CPU server
  run on low-end GPUs.
- Negative: each browser profile caches its own copy; clearing site data re-downloads.
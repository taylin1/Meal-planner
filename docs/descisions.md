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
**Status:** Accepted

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
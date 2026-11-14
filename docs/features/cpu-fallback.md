# Spec: CPU fallback for the cooking helper (WebLLM + wllama)

## 1. Goal

The cooking helper must work on as many devices as possible, using the **same model (Qwen3 0.6B)** everywhere.

- **Model** = the weights (Qwen3 0.6B). Does not change.
- **Engine** = the software that runs the weights. This is what fails on some devices.

Today the only engine is WebLLM, which needs WebGPU. Devices without WebGPU (or where the GPU load fails) cannot use the helper.

Add a second engine that runs on the CPU through WebAssembly, and choose between the two engines automatically.

| Level | Engine | Used when |
|---|---|---|
| 1 | WebLLM + Qwen3 0.6B (MLC weights) | WebGPU works and the load succeeds |
| 2 | wllama + Qwen3 0.6B (GGUF weights) | No WebGPU, or the WebLLM load fails |
| 3 | No AI | Both engines fail. Hide the box, rest of the app works normally |

Switching to Llama is NOT part of this task. Llama would still need an engine, and WebLLM would still need WebGPU.

## 2. Non-goals

- No new model family (stay with Qwen3 0.6B).
- No hosted API or server fallback in this task.
- No changes to the Express backend, Supabase, or Edamam code.
- No chat history or streaming UI. Keep the current "ask one question, show one answer" behaviour.

## 3. Current code (do not break)

Existing files, as they work today:

- `foodHealthGuard.js` exports `isFoodOrHealthQuestion(question)`.
- The AI module (currently uses `loadQvacModel`, `isModelSupported`, `askQuestion`, `stripThinking`, `SYSTEM_PROMPT`, a web worker file `qvacWorker.js`, and `import.meta.env.VITE_QVAC_MODEL_ID`).
- Existing WebLLM model id: `Qwen3-0.6B-q4f16_1-MLC`.

Rule: **the public functions used by the React components must keep working without the components needing to know which engine is running.**

## 4. Code style (required)

- Named function declarations for handlers and logic, not arrow functions.
- Simple, plain variable names.
- Straightforward, minimal structure. No clever abstractions or heavy class hierarchies.
- Plain-language comments.

## 5. Proposed file structure

```
src/ai/
  aiEngine.js        // chooses the engine, exposes the public functions
  webllmEngine.js    // current WebLLM code, moved here
  wllamaEngine.js    // new CPU engine
  qvacWorker.js      // existing WebLLM worker (unchanged)
  promptHelpers.js   // SYSTEM_PROMPT, buildUserMessage, stripThinking
  foodHealthGuard.js // existing guard (moved or kept where it is)
```

The exact folder can follow the repo's existing layout. What matters is the separation: one file per engine, one file that chooses.

## 6. Public interface (what React uses)

`aiEngine.js` must export:

```js
// Starts loading in the background. Safe to call more than once.
// onProgress receives { progress: number 0 to 1, text: string }
export function startAi(onProgress) {}

// Returns 'webgpu', 'cpu', 'loading', or 'none'
export function getAiStatus() {}

// Same signature as today. Meal is optional.
// Resolves to { answer: string }. Throws Error with a friendly message.
export async function askQuestion(question, meal) {}
```

Rules:
- Only one engine is loaded per tab. Never load both.
- Calling `startAi` twice must not load the weights twice (reuse the same promise).
- If loading fails, allow a later retry. Do not cache a rejected promise.

## 7. Engine selection logic

```
function chooseEngine():
  if navigator.gpu does not exist -> 'cpu'
  adapter = await navigator.gpu.requestAdapter()
  if adapter is null -> 'cpu'
  return 'webgpu'

function startAi():
  engineType = await chooseEngine()

  if engineType is 'webgpu':
    try load WebLLM engine -> status 'webgpu', done
    catch -> fall through to CPU

  try load wllama engine -> status 'cpu', done
  catch -> status 'none'
```

Important: the `try/catch` around the WebLLM load is required. A device can have WebGPU but still fail (missing GPU features, memory limits). In that case it must fall back to the CPU engine, not show an error.

## 8. WebLLM engine (`webllmEngine.js`)

Move the existing WebLLM code here with no behaviour change:

- Model id from `VITE_QVAC_MODEL_ID`, default `Qwen3-0.6B-q4f16_1-MLC`.
- Keep `CreateWebWorkerMLCEngine`, `hasModelInCache`, the dynamic `import('@mlc-ai/web-llm')`, and `enable_thinking: false`.
- Export `loadWebLlm(onProgress)` and `askWebLlm(messages)`.

## 9. wllama engine (`wllamaEngine.js`), new

Library: `@wllama/wllama` (runs llama.cpp in the browser through WebAssembly, loads GGUF files).

**Verify against the current wllama docs before coding.** The package's config paths, method names and options change between versions. Do not guess. Pin an exact version in `package.json`.

Requirements:

1. Import wllama with a dynamic `import()` so it stays out of the main bundle and is only fetched on the CPU path.
2. Load the WebAssembly files the way the wllama docs describe for the installed version (for Vite, usually by importing the `.wasm` files with `?url`).
3. Load the model from a GGUF URL.
   - Model: Qwen3 0.6B in GGUF format.
   - Prefer a **Q4_K_M** quantization to keep memory and download size low. Confirm the exact Hugging Face repo and file name, and confirm the file is served with CORS headers that allow browser download.
   - Make the GGUF URL configurable: `VITE_WLLAMA_MODEL_URL`.
4. Use a small context size (for example 2048 or lower) to limit memory.
5. Report load progress through the same `onProgress({ progress, text })` shape.
6. Export `loadWllama(onProgress)` and `askWllama(messages)`.
7. Chat template: use the model's built-in chat template if wllama supports it for this model. Otherwise build the Qwen chat format manually. Confirm which works.
8. Generation settings for this engine: temperature 0.2, top_p 0.8, max new tokens 250. Answers run 4 to 8 sentences; bumping the budget keeps a full reply from being cut off on the CPU path.

### 9.1 Thinking mode

Qwen3 can emit a thinking block. There is no `enable_thinking` option in this engine, so:

- Append ` /no_think` to the user message (Qwen3's soft switch).
- Always run the result through `stripThinking()` before returning it.

### 9.2 Threads and required headers

Multi-threaded WebAssembly needs `SharedArrayBuffer`, which needs the page to be cross-origin isolated. Without it, wllama runs single-threaded and is much slower. It must still work either way.

Add these response headers:

```
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

Where:
- **Vite dev server:** `server.headers` in `vite.config.js`, and also `preview.headers`.
- **Production host:** add the same headers in the hosting dashboard or config (Render static sites support custom headers).

After adding the headers, test the whole site. `require-corp` can block images, fonts or scripts from other origins that do not send the right CORS or CORP headers. If something breaks, fix that resource or fall back to single-thread mode and report it. Also check that calls to the existing backend API and Supabase still work.

The code should check `crossOriginIsolated` at runtime. If it is false, use single-thread settings and log a short console note (do not show it to the user).

## 10. Shared prompt rules (`promptHelpers.js`)

Both engines must build their messages with the same helper so answers are consistent.

System prompt:

```
You are a helpful nutrition and health assistant. Only answer questions
about food, diet, nutrition, and health. Answer clearly and concisely in
4 to 8 sentences.
```

> Updated during implementation: the spec's original cooking-assistant prompt
> made the 0.6B model refuse every general nutrition question with "I am not
> sure, please check the recipe." Restored the concise nutrition-assistant
> prompt from the pre-refactor qvacModel.js, which produced reliable answers
> before. The answer length was later set to 4 to 8 sentences (with the
> matching token budgets below) at the product owner's request.

User message:

- If a meal with a name is passed: `Meal: <name>. Ingredients: <list>. Question: <question>`
- If no meal: just the question.

Guard rule:

- If a meal is passed, skip the keyword guard (the meal gives the context).
- If no meal is passed, run `isFoodOrHealthQuestion`, and throw `Please ask a food or health related question.` when it fails.

Also:
- Reject empty questions and questions over 300 characters.
- `stripThinking()` removes `<think>...</think>` blocks and trims.
- Throw an error if the final answer is empty.

## 11. UI behaviour

Do not show the words "model", "loading model", "WebGPU" or "engine" to users.

| Status | What the user sees |
|---|---|
| `loading` | The ask box is hidden, or disabled with the placeholder "Your cooking helper is getting ready..." |
| `webgpu` or `cpu` | The ask box is active |
| `none` | The ask box is hidden. The rest of the meal page works normally. |

Other rules:
- Start loading in the background when the meal page opens (call `startAi` once, e.g. in a `useEffect`).
- Show a simple progress bar during a first-time download, with a one-time message such as "Setting up your cooking helper (one time only)".
- On the CPU engine, show a short "Thinking..." message while answering, since answers take longer.
- Show a small note under answers: "AI-generated, please double-check cooking times and allergy information."
- Optional: three suggestion buttons under the input ("How do I cook this?", "Can I swap an ingredient?", "How do I store leftovers?") that call `askQuestion` with those texts.
- Ask the browser to keep the cached model files: `navigator.storage.persist()` (ignore failures).

## 12. Error handling

- Never crash the page because the AI failed. All failures end in status `none`.
- Friendly user-facing messages only. Technical details go to `console.error`.
- Do not use `alert()`.
- A failed load must be retryable (do not cache a rejected promise).

## 13. Performance notes

- Only the chosen engine's code and weights are downloaded.
- Both engines use `import()` so neither is in the initial bundle.
- Expect the CPU engine to be much slower to load and to answer. That is acceptable, because the goal is to work everywhere. Keep `max_tokens` low.
- iPhone Safari can kill a tab that uses too much memory. If the CPU load crashes the tab on a test phone, lower `n_ctx` or use a smaller quantization.

## 14. Acceptance criteria

1. On a device with WebGPU, the helper uses WebLLM and behaves exactly as it does today.
2. On a browser without WebGPU, the helper loads through wllama and answers a question.
3. If the WebLLM load throws on a WebGPU device, the app falls back to wllama with no error shown.
4. If both engines fail, the ask box is hidden and the rest of the page works.
5. Only one engine's weights are downloaded per device.
6. Calling `startAi` multiple times never loads the model twice.
7. No user-facing text contains "model", "WebGPU" or "engine".
8. Existing callers of `askQuestion(question, meal)` still work unchanged.
9. With the COOP/COEP headers on, the rest of the site (API calls, Supabase, images, fonts) still works.
10. The code follows the style rules in section 4.

## 15. Test matrix

| Test | Expected |
|---|---|
| Desktop Chrome with WebGPU | `webgpu` status, fast answers |
| iPhone Safari opened directly (not an in-app browser) | Works with whichever engine loads |
| iPhone in-app browser (for example opened from a chat app) | Falls back to CPU or `none`, no broken UI |
| Desktop browser with WebGPU disabled (force the fallback) | `cpu` status, slower but working |
| Network off after the first load | Still answers (cached files) |
| Ask "How do I cook this faster?" with a meal attached | Short, relevant answer |
| Ask an unrelated question (for example about the weather) | The polite "I can only help with..." reply |
| Ask a question over 300 characters | Rejected with a friendly message |

## 16. Implementation notes (resolved)

These were the open items in section 16. They are decided; keep them in mind
before changing the engine code.

- **wllama version:** `@wllama/wllama@3.13.0`, pinned exactly in
  `client/package.json`. V3 API: `new Wllama({ default: wasmUrl })`,
  `loadModelFromUrl(url, { n_ctx, n_threads, n_gpu_layers, useCache,
  progressCallback })`, `createChatCompletion({ messages, temperature, top_p,
  max_tokens, chat_template_kwargs })`, result at
  `response.choices[0].message.content`. Load progress arrives as
  `{ loaded, total }`.
- **WebAssembly files:** imported as `@wllama/wllama/esm/wasm/wllama.wasm?url`
  so Vite emits the file as an asset. The import lives in `wllamaEngine.js`,
  which is itself dynamically imported, so it stays out of the main bundle.
- **GGUF model:** `bartowski/Qwen_Qwen3-0.6B-GGUF`, file
  `Qwen_Qwen3-0.6B-Q4_K_M.gguf` (about 484 MB), served by Hugging Face through
  CORS, so the browser can fetch it. Override with `VITE_WLLAMA_MODEL_URL`.
- **Chat template:** V3 uses the Jinja template stored in the GGUF, so the Qwen
  chat format is applied automatically. Thinking is turned off through
  `chat_template_kwargs: { enable_thinking: false }`, and the user message still
  ends with `/no_think` because that is the only switch WebLLM's prompt path
  relies on.
- **COOP/COEP: not enabled.** Decision made with the product owner: the Edamam
  recipe image CDN sends no CORS or CORP headers, so `COEP: require-corp`
  would break every recipe photo in the meal plan. wllama therefore runs
  single-threaded (`n_threads: 1` when `crossOriginIsolated` is false, plus a
  console note). The rest of the site is unaffected. If recipe images ever move
  behind a proxy with the right headers, the two headers can be added to
  `vite.config.js` (`server.headers` and `preview.headers`) and the host config.
- **Hosting:** no header change is needed by this implementation, so nothing to
  configure on Render/Vercel.
- **Measured load time and memory on a real phone:** still open. If a phone
  kills the tab during the first CPU load, lower `CONTEXT_SIZE` in
  `wllamaEngine.js` or switch the default GGUF to a smaller quantization.

## 17. Open items to confirm during implementation

- Exact wllama version and the current API for config paths, model loading and chat completion.
- Exact Qwen3 0.6B GGUF repo and file name, and its CORS behaviour.
- Whether wllama applies the Qwen chat template automatically.
- Where the production frontend is hosted and how to set COOP/COEP headers there.
- Measured load time and memory on at least one real phone, to decide the `n_ctx` and quantization defaults.

(The items above are answered in section 16.)

// WebLLM engine: runs the model on the GPU through WebGPU.
// This is the existing behaviour, moved here unchanged.

// Qwen3 0.6B, shipped as MLC weights for WebGPU (about 350 MB, cached by the
// browser after the first load). Override VITE_QVAC_MODEL_ID to switch models.
const MODEL_ID = import.meta.env.VITE_QVAC_MODEL_ID || 'Qwen3-0.6B-q4f16_1-MLC'

// One engine for the whole tab. Creating it twice would load the weights twice.
let engine = null
let enginePromise = null
let progressListener = null

function onLoadProgress(report, cached) {
  if (!progressListener) return

  progressListener({
    progress: report.progress,
    text: report.text,
    cached: cached
  })
}

export function loadWebLlm(onProgress) {
  if (onProgress) progressListener = onProgress
  if (engine) return Promise.resolve(engine)
  if (enginePromise) return enginePromise

  enginePromise = (async function () {
    // WebLLM is several megabytes of JS. Importing it here keeps it out of the
    // dashboard's initial bundle; it only loads when the ask bar starts.
    const { CreateWebWorkerMLCEngine, hasModelInCache } = await import('@mlc-ai/web-llm')

    // hasModelInCache() lets us say "opening the saved model" instead of
    // showing a download bar at 0% when everything is already on disk.
    const cached = await hasModelInCache(MODEL_ID).catch(function () {
      return false
    })

    const worker = new Worker(new URL('./qvacWorker.js', import.meta.url), {
      type: 'module'
    })

    engine = await CreateWebWorkerMLCEngine(
      worker,
      MODEL_ID,
      {
        initProgressCallback: function (report) {
          onLoadProgress(report, cached)
        }
      },
      // Qwen3 reasons before answering by default. Turning thinking off keeps
      // the answer at 2–4 sentences and is much faster on a small GPU.
      { enable_thinking: false }
    )

    return engine
  })().catch(function (err) {
    // Allow a later retry instead of caching a rejected promise forever.
    enginePromise = null
    engine = null
    throw err
  })

  return enginePromise
}

export async function askWebLlm(messages) {
  const loaded = await loadWebLlm()

  const completion = await loaded.chat.completions.create({
    messages: messages,
    temperature: 0.3,
    top_p: 0.9,
    max_tokens: 350,
    stream: false,
    extra_body: { enable_thinking: false }
  })

  return completion.choices[0].message.content || ''
}

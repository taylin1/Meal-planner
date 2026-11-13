import { isFoodOrHealthQuestion } from './foodHealthGuard'

// Qwen3 0.6B, the same model the Express server used to load through Qvac.
// WebLLM ships it as MLC weights for WebGPU (about 350 MB, cached by the
// browser after the first load). Override VITE_QVAC_MODEL_ID to switch models.
const MODEL_ID = import.meta.env.VITE_QVAC_MODEL_ID || 'Qwen3-0.6B-q4f16_1-MLC'

const SYSTEM_PROMPT = 'You are a helpful nutrition and health assistant. Only answer questions about food, diet, nutrition, and health. Answer clearly and concisely in 2–4 sentences.'

// One engine for the whole tab. Creating it twice would load the weights twice.
let engine = null
let enginePromise = null
let progressListener = null

export function isModelSupported() {
  return typeof navigator !== 'undefined' && Boolean(navigator.gpu)
}

export function loadQvacModel(onProgress) {
  if (onProgress) progressListener = onProgress
  if (engine) return Promise.resolve(engine)
  if (enginePromise) return enginePromise

  if (!isModelSupported()) {
    return Promise.reject(
      new Error('This browser cannot run the model. WebGPU is required — try Chrome or Edge.')
    )
  }

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
          if (!progressListener) return
          progressListener({
            progress: report.progress,
            text: report.text,
            cached: cached
          })
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

// The model can still emit a  thinking block if it ignores enable_thinking.
// Strip it so DisplayAnswer only ever renders plain prose.
function stripThinking(text) {
  return text.replace(/<think(?:ing)?>[\s\S]*?<\/think(?:ing)?>/gi, '').trim()
}

export async function askQuestion(question) {
  if (!question || typeof question !== 'string' || question.trim() === '') {
    throw new Error('Please provide a question.')
  }

  if (!isFoodOrHealthQuestion(question)) {
    throw new Error('Please ask a food or health related question.')
  }

  const loaded = await loadQvacModel()

  const completion = await loaded.chat.completions.create({
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      // `/no_think` is Qwen3's soft switch for skipping the reasoning block.
      { role: 'user', content: question + ' /no_think' }
    ],
    temperature: 0.3,
    top_p: 0.9,
    max_tokens: 200,
    stream: false,
    extra_body: { enable_thinking: false }
  })

  const answer = stripThinking(completion.choices[0].message.content || '')

  if (answer.length === 0) {
    throw new Error('Received empty response from model.')
  }

  return { answer: answer }
}

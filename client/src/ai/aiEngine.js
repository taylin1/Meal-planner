// Chooses which engine runs the cooking helper and exposes the functions the
// React components use. Components never need to know which engine is active.
import { checkQuestion, buildMessages, stripThinking } from './promptHelpers'

// The engine files are imported only when they are needed, so the browser
// downloads one engine and never the other.

// 'loading' | 'webgpu' | 'cpu' | 'none'
let status = 'loading'

// Which engine actually loaded. Only one ever does.
let activeEngine = null

let startPromise = null
let progressListener = null

function reportProgress(report) {
  if (progressListener) progressListener(report)
}

// WebGPU is the fast path. A device can be missing the API entirely, or have
// it and still return no adapter, which means the GPU is not usable.
async function chooseEngine() {
  if (typeof navigator === 'undefined' || !navigator.gpu) {
    return 'cpu'
  }

  try {
    const adapter = await navigator.gpu.requestAdapter()

    if (!adapter) return 'cpu'

    return 'webgpu'
  } catch (err) {
    console.error('Could not ask for a GPU adapter, using the CPU engine.', err)
    return 'cpu'
  }
}

// Asks the browser to keep the downloaded weights instead of clearing them
// when storage gets tight. Failures are not important.
function askToKeepFiles() {
  if (typeof navigator === 'undefined' || !navigator.storage || !navigator.storage.persist) return

  navigator.storage.persist().catch(function () {})
}

async function loadEngines() {
  status = 'loading'

  askToKeepFiles()

  const engineType = await chooseEngine()

  if (engineType === 'webgpu') {
    try {
      const { loadWebLlm } = await import('./webllmEngine')

      await loadWebLlm(reportProgress)
      activeEngine = 'webgpu'
      status = 'webgpu'
      return
    } catch (err) {
      // A device can have WebGPU and still fail on load (missing features,
      // memory limits). Fall back to the CPU engine instead of giving up.
      console.error('The GPU version could not start, trying the CPU version.', err)
    }
  }

  try {
    const { loadWllama } = await import('./wllamaEngine')

    await loadWllama(reportProgress)
    activeEngine = 'cpu'
    status = 'cpu'
  } catch (err) {
    console.error('The cooking helper could not start on this device.', err)
    activeEngine = null
    status = 'none'
  }
}

// Starts loading in the background. Safe to call more than once: the same
// promise is reused, so the weights are never downloaded twice.
export function startAi(onProgress) {
  if (onProgress) progressListener = onProgress

  if (activeEngine) return Promise.resolve(status)
  if (startPromise) return startPromise

  startPromise = loadEngines().finally(function () {
    // A failed load ends in 'none'. Clearing the promise here lets a later
    // call retry instead of reusing a finished attempt.
    startPromise = null
  })

  return startPromise
}

export function getAiStatus() {
  return status
}

export async function askQuestion(question, meal) {
  const text = checkQuestion(question, meal)
  const messages = buildMessages(text, meal)

  if (!activeEngine) {
    await startAi()
  }

  if (!activeEngine) {
    throw new Error('The cooking helper is not available right now.')
  }

  let rawAnswer

  try {
    if (activeEngine === 'webgpu') {
      const { askWebLlm } = await import('./webllmEngine')

      rawAnswer = await askWebLlm(messages)
    } else {
      const { askWllama } = await import('./wllamaEngine')

      rawAnswer = await askWllama(messages)
    }
  } catch (err) {
    console.error('The cooking helper could not answer.', err)
    throw new Error('The cooking helper could not answer that. Please try again.', { cause: err })
  }

  const answer = stripThinking(rawAnswer)

  if (answer.length === 0) {
    // Not shown to the user, but it is the only clue when the model returns
    // nothing at all.
    console.error('The cooking helper returned an empty answer.', { raw: rawAnswer, engine: activeEngine })
    throw new Error('The cooking helper could not answer that. Please try again.')
  }

  return { answer: answer }
}

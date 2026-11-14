// CPU engine: wllama runs llama.cpp in the browser through WebAssembly, so it
// works on devices without WebGPU. It downloads GGUF weights instead of MLC.
import wasmUrl from '@wllama/wllama/esm/wasm/wllama.wasm?url'

// Qwen3 0.6B in GGUF form. Override VITE_WLLAMA_MODEL_URL to switch files.
const DEFAULT_MODEL_URL =
  'https://huggingface.co/bartowski/Qwen_Qwen3-0.6B-GGUF/resolve/main/Qwen_Qwen3-0.6B-Q4_K_M.gguf'

const MODEL_URL = import.meta.env.VITE_WLLAMA_MODEL_URL || DEFAULT_MODEL_URL

// Small context and short answers keep memory low; a phone can kill a tab that
// asks for too much.
const CONTEXT_SIZE = 2048
const MAX_ANSWER_TOKENS = 250

let instance = null
let loadPromise = null
let progressListener = null

// Multi-threaded WebAssembly needs SharedArrayBuffer, which needs the page to
// be cross-origin isolated. Without that we run single-threaded: slower, but it
// still works.
function isCrossOriginIsolated() {
  return typeof crossOriginIsolated !== 'undefined' && crossOriginIsolated === true
}

function reportDownload(progress) {
  if (!progressListener) return

  const total = progress.total || 0
  const loaded = progress.loaded || 0

  progressListener({
    progress: total > 0 ? loaded / total : 0,
    text: 'Setting up your cooking helper'
  })
}

export function loadWllama(onProgress) {
  if (onProgress) progressListener = onProgress
  if (instance) return Promise.resolve(instance)
  if (loadPromise) return loadPromise

  loadPromise = (async function () {
    // wllama is a large WebAssembly package. Importing it here keeps it out of
    // the main bundle; only the CPU path ever fetches it.
    const { Wllama } = await import('@wllama/wllama')

    const crossOriginIsolatedPage = isCrossOriginIsolated()

    if (!crossOriginIsolatedPage) {
      // Not shown to the user, only a note for developers.
      console.info('Cooking helper: running on one thread because the page is not cross-origin isolated.')
    }

    const wllama = new Wllama({ default: wasmUrl })

    await wllama.loadModelFromUrl(MODEL_URL, {
      n_ctx: CONTEXT_SIZE,
      n_gpu_layers: 0,
      n_threads: crossOriginIsolatedPage ? undefined : 1,
      useCache: true,
      progressCallback: reportDownload
    })

    instance = wllama

    return wllama
  })().catch(function (err) {
    // Allow a later retry instead of caching a rejected promise forever.
    loadPromise = null
    instance = null
    throw err
  })

  return loadPromise
}

export async function askWllama(messages) {
  const loaded = await loadWllama()

  const completion = await loaded.createChatCompletion({
    messages: messages,
    temperature: 0.2,
    top_p: 0.8,
    max_tokens: MAX_ANSWER_TOKENS,
    stream: false,
    cache_prompt: true,
    // Qwen3's chat template understands this the same way WebLLM does.
    chat_template_kwargs: { enable_thinking: false }
  })

  return completion.choices[0].message.content || ''
}

import { WebWorkerMLCEngineHandler } from '@mlc-ai/web-llm'

// The engine lives in this worker. WebLLM sends requests from the page to
// here over postMessage, so loading and generating never freeze the UI.
const handler = new WebWorkerMLCEngineHandler()

self.onmessage = function (event) {
  handler.onmessage(event)
}

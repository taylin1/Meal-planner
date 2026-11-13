import { useState } from 'react'

function QuestionBar({ onAsk, loading, modelStatus, modelProgress }) {
  const [question, setQuestion] = useState('')
  const modelReady = modelStatus === 'ready'

  function handleSubmit(event) {
    event.preventDefault()
    const trimmed = question.trim()
    if (!trimmed || loading || !modelReady) return
    onAsk(trimmed)
  }

  function handleKeyDown(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
      handleSubmit(event)
    }
  }

  // Reuses the existing subtitle line, so the card layout stays unchanged.
  function statusText() {
    if (modelStatus === 'loading') {
      return modelProgress > 0
        ? 'Loading model… ' + Math.round(modelProgress * 100) + '%'
        : 'Preparing the model…'
    }

    if (modelStatus === 'error') {
      return 'The model could not load. WebGPU is required — try Chrome or Edge.'
    }

    return 'Food and health questions only'
  }

  return (
    <div className="bg-white rounded-3xl p-6 shadow-sm flex flex-col gap-4">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Ask a question</h2>
        <p className="text-sm text-gray-500 mt-1">{statusText()}</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <textarea
          className="bg-gray-100 rounded-2xl px-4 py-3 text-sm w-full resize-none focus:outline-none focus:ring-2 focus:ring-orange-500"
          rows={4}
          placeholder="e.g. How much protein does chicken have?"
          value={question}
          onChange={function (e) { setQuestion(e.target.value) }}
          onKeyDown={handleKeyDown}
          disabled={loading}
        />

        <button
          type="submit"
          disabled={loading || !modelReady || !question.trim()}
          className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-full px-6 py-2 text-sm font-medium transition-colors self-start"
        >
          {loading ? 'Asking…' : 'Ask'}
        </button>
      </form>
    </div>
  )
}

export default QuestionBar

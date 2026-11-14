import { useState } from 'react'

// status is 'loading', 'webgpu', 'cpu' or 'none'. The names of the engines are
// never shown to the user.
function QuestionBar({ onAsk, loading, modelStatus, modelProgress }) {
  const [question, setQuestion] = useState('')
  const helperReady = modelStatus === 'webgpu' || modelStatus === 'cpu'
  const preparing = modelStatus === 'loading'

  function handleSubmit(event) {
    event.preventDefault()
    const trimmed = question.trim()
    if (!trimmed || loading || !helperReady) return
    onAsk(trimmed)
  }

  function handleKeyDown(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
      handleSubmit(event)
    }
  }

  function statusText() {
    if (preparing) return 'Getting the cooking helper ready'
    return 'Food and health questions only'
  }

  function buttonText() {
    if (loading) return modelStatus === 'cpu' ? 'Thinking…' : 'Asking…'
    return 'Ask'
  }

  return (
    <div className="bg-white rounded-3xl p-6 shadow-sm flex flex-col gap-4">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Ask a question</h2>
        <p className="text-sm text-gray-500 mt-1">{statusText()}</p>
      </div>

      {preparing ? (
        <div className="flex flex-col gap-2">
          <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full bg-orange-500 transition-all"
              style={{ width: Math.round(modelProgress * 100) + '%' }}
            />
          </div>
          <p className="text-xs text-gray-500">Setting up your cooking helper (one time only)</p>
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <textarea
          className="bg-gray-100 rounded-2xl px-4 py-3 text-sm w-full resize-none focus:outline-none focus:ring-2 focus:ring-orange-500"
          rows={4}
          placeholder={preparing ? 'Your cooking helper is getting ready...' : 'e.g. How much protein does chicken have?'}
          value={question}
          onChange={function (e) { setQuestion(e.target.value) }}
          onKeyDown={handleKeyDown}
          disabled={loading || preparing}
        />

        <button
          type="submit"
          disabled={loading || !helperReady || !question.trim()}
          className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-full px-6 py-2 text-sm font-medium transition-colors self-start"
        >
          {buttonText()}
        </button>
      </form>
    </div>
  )
}

export default QuestionBar

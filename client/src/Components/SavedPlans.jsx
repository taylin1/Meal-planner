import { useState } from 'react'
import { planTitle, planSubtitle } from '../lib/planOptions'

function SavedPlans({ plans, loading, error, selectedPlanId, onView, onDelete }) {
  const [deleteError, setDeleteError] = useState('')
  const [deletingId, setDeletingId] = useState('')

  async function handleDelete(plan) {
    if (!window.confirm('Delete this plan?')) {
      return
    }

    setDeleteError('')
    setDeletingId(plan.id)

    try {
      await onDelete(plan.id)
    } catch (err) {
      setDeleteError(err.message)
    }

    setDeletingId('')
  }

  return (
    <section className="rounded-3xl bg-white p-6 shadow-sm">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="text-2xl font-bold text-gray-900">Saved plans</h2>
        <span className="text-sm text-gray-500">Newest first</span>
      </div>

      {loading ? <p className="mt-4 text-sm text-gray-500">Loading plans...</p> : null}

      {!loading && error ? (
        <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-500">{error}</p>
      ) : null}

      {deleteError ? (
        <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-500">{deleteError}</p>
      ) : null}

      {!loading && !error && plans.length === 0 ? (
        <p className="mt-4 text-sm text-gray-500">No saved plans yet</p>
      ) : null}

      <ul className="mt-4 flex flex-col gap-3">
        {plans.map(function (plan) {
          const selected = plan.id === selectedPlanId

          return (
            <li
              key={plan.id}
              className={
                selected
                  ? 'flex items-center justify-between gap-4 rounded-2xl bg-gray-100 px-4 py-3'
                  : 'flex items-center justify-between gap-4 rounded-2xl bg-gray-50 px-4 py-3'
              }
            >
              <div>
                <p className="font-semibold text-gray-900">{planTitle(plan)}</p>
                <p className="text-sm text-gray-500">{planSubtitle(plan)}</p>
              </div>

              <div className="flex shrink-0 items-center gap-3">
                <button
                  type="button"
                  onClick={function () { onView(plan) }}
                  className="rounded-full border border-orange-500 px-4 py-1.5 text-sm font-medium text-orange-500 transition-colors hover:bg-orange-500 hover:text-white"
                >
                  View
                </button>

                <button
                  type="button"
                  aria-label="Delete plan"
                  disabled={deletingId === plan.id}
                  onClick={function () { handleDelete(plan) }}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-lg text-gray-700 hover:bg-gray-200 disabled:opacity-50"
                >
                  ×
                </button>
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

export default SavedPlans

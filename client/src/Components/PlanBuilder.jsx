import { useState } from 'react'
import { DAYS, MEALS, DIETS } from '../lib/planOptions'

function PlanBuilder({ onGenerate }) {
  const [days, setDays] = useState(3)
  const [meals, setMeals] = useState(['Breakfast', 'Lunch'])
  const [diet, setDiet] = useState('vegetarian')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function toggleMeal(meal) {
    if (meals.includes(meal)) {
      setMeals(meals.filter(function (item) {
        return item !== meal
      }))
      return
    }

    setMeals(meals.concat(meal))
  }

  function toggleDiet(value) {
    setDiet(diet === value ? '' : value)
  }

  async function handleGenerate() {
    setError('')

    if (meals.length === 0) {
      setError('Pick at least one meal')
      return
    }

    setLoading(true)

    try {
      // Keep the section order stable no matter which order the pills were clicked
      const orderedMeals = MEALS.filter(function (meal) {
        return meals.includes(meal)
      })

      await onGenerate({
        days,
        meals: orderedMeals,
        healthLabels: diet ? [diet] : []
      })
    } catch (err) {
      setError(err.message)
    }

    setLoading(false)
  }

  return (
    <section className="rounded-3xl bg-white p-6 shadow-sm">
      <h2 className="text-2xl font-bold text-gray-900">Create your plan</h2>
      <p className="mt-1 text-sm text-gray-500">Pick your days, meals and diet</p>

      <div className="mt-6">
        <h3 className="text-sm font-semibold text-gray-900">Number of days</h3>
        <div className="mt-3 flex flex-wrap gap-2">
          {DAYS.map(function (day) {
            const selected = day === days

            return (
              <button
                key={day}
                type="button"
                aria-pressed={selected}
                onClick={function () { setDays(day) }}
                className={
                  selected
                    ? 'h-10 w-10 rounded-full bg-orange-500 text-sm font-semibold text-white'
                    : 'h-10 w-10 rounded-full bg-gray-100 text-sm font-medium text-gray-900 hover:bg-gray-200'
                }
              >
                {day}
              </button>
            )
          })}
        </div>
      </div>

      <div className="mt-6">
        <h3 className="text-sm font-semibold text-gray-900">Meals</h3>
        <div className="mt-3 flex flex-wrap gap-2">
          {MEALS.map(function (meal) {
            const selected = meals.includes(meal)

            return (
              <button
                key={meal}
                type="button"
                aria-pressed={selected}
                onClick={function () { toggleMeal(meal) }}
                className={
                  selected
                    ? 'rounded-full bg-orange-500 px-4 py-2 text-sm font-medium text-white'
                    : 'rounded-full bg-gray-100 px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-200'
                }
              >
                {meal}
              </button>
            )
          })}
        </div>
      </div>

      <div className="mt-6">
        <h3 className="text-sm font-semibold text-gray-900">Diet</h3>
        <div className="mt-3 flex flex-wrap gap-2">
          {DIETS.map(function (option) {
            const selected = diet === option.value

            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={selected}
                onClick={function () { toggleDiet(option.value) }}
                className={
                  selected
                    ? 'rounded-full border border-orange-500 bg-white px-4 py-2 text-sm font-medium text-gray-900'
                    : 'rounded-full border border-transparent bg-gray-100 px-4 py-2 text-sm text-gray-700 hover:bg-gray-200'
                }
              >
                {selected ? <span className="text-orange-500">✓ </span> : null}
                {option.label}
              </button>
            )
          })}
        </div>
      </div>

      {error ? (
        <p
          role="alert"
          className="mt-6 rounded-2xl border border-dashed border-red-300 bg-red-50 px-4 py-3 text-sm text-red-500"
        >
          {error}
        </p>
      ) : null}

      <button
        type="button"
        onClick={handleGenerate}
        disabled={loading}
        className="mt-6 w-full rounded-full bg-orange-500 px-6 py-4 text-base font-semibold text-white transition-colors hover:bg-orange-600 disabled:opacity-50"
      >
        {loading ? 'Generating...' : 'Generate plan'}
      </button>
    </section>
  )
}

export default PlanBuilder

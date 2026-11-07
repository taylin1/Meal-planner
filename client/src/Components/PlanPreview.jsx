import { useState } from 'react'
import { dietLabel } from '../lib/planOptions'

function planDayTotal(day) {
  const sections = day.sections || {}

  const total = Object.values(sections).reduce(function (sum, meal) {
    return sum + (meal.calories || 0)
  }, 0)

  return total
}

function firstMealKey(plan) {
  const firstDay = plan && plan.plan_data ? plan.plan_data[0] : null
  const firstMeal = firstDay && firstDay.sections ? Object.keys(firstDay.sections)[0] : ''

  return firstMeal ? '0-' + firstMeal : ''
}

function PlanPreview({ plan, ref, viewingSaved }) {
  const [chosenMeal, setChosenMeal] = useState(null)

  const planId = plan ? plan.id : ''

  // Day 1's first meal starts open, like the mockup; a click overrides it
  const openMeal = chosenMeal && chosenMeal.planId === planId
    ? chosenMeal.key
    : firstMealKey(plan)

  function toggleMeal(key) {
    setChosenMeal({ planId: planId, key: openMeal === key ? '' : key })
  }

  if (!plan) {
    return (
      <section className="rounded-3xl bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-bold text-gray-900">Your plan</h2>
        <p className="mt-2 text-sm text-gray-500">Generate a plan or view a saved one.</p>
      </section>
    )
  }

  const days = Array.isArray(plan.plan_data) ? plan.plan_data : []
  const diet = dietLabel((plan.health_labels || [])[0])

  return (
    <section
      ref={ref}
      tabIndex={-1}
      aria-live="polite"
      className="scroll-mt-6 rounded-3xl bg-white p-6 shadow-sm outline-none"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Your plan</h2>
          {viewingSaved ? (
            <p className="mt-1 text-sm font-medium text-orange-500">Viewing saved plan</p>
          ) : null}
        </div>
        <p className="text-sm text-gray-500">
          {plan.days} days{diet ? ', ' + diet.toLowerCase() : ', no diet filter'}
        </p>
      </div>

      <div className="mt-6 flex flex-col gap-6">
        {days.map(function (day, index) {
          const sections = day.sections || {}
          const mealNames = Object.keys(sections)
          const dayTotal = planDayTotal(day)

          return (
            <div key={index}>
              <div className="flex items-baseline justify-between gap-4">
                <h3 className="font-semibold text-gray-900">Day {index + 1}</h3>
                <span className="text-sm text-gray-500">
                  {dayTotal > 0 ? dayTotal.toLocaleString() + ' kcal' : ''}
                </span>
              </div>

              <ul className="mt-2 flex flex-col gap-2">
                {mealNames.map(function (mealName) {
                  const meal = sections[mealName] || {}
                  const key = index + '-' + mealName
                  const open = openMeal === key
                  const ingredients = Array.isArray(meal.ingredientLines) ? meal.ingredientLines : []
                  const canOpen = ingredients.length > 0 || Boolean(meal.url)

                  return (
                    <li key={mealName} className="rounded-2xl bg-gray-50 px-4 py-3">
                      <div className="flex items-center gap-4">
                        {meal.image ? (
                          <img
                            src={meal.image}
                            alt={meal.label || 'Recipe image'}
                            loading="lazy"
                            className="h-16 w-16 shrink-0 rounded-2xl object-cover"
                          />
                        ) : (
                          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-orange-100">
                            <div className="h-6 w-6 rounded-full border-4 border-white" />
                          </div>
                        )}

                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-orange-500">{mealName}</p>
                          <p className="truncate font-semibold text-gray-900">
                            {meal.label || 'Recipe details unavailable'}
                          </p>
                          <p className="text-sm text-gray-500">
                            {meal.calories
                              ? meal.calories + ' kcal per serving'
                              : 'Calories unavailable'}
                          </p>
                        </div>

                        {canOpen ? (
                          <button
                            type="button"
                            aria-expanded={open}
                            aria-label={open ? 'Hide ingredients' : 'Show ingredients'}
                            onClick={function () { toggleMeal(key) }}
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200"
                          >
                            <svg
                              viewBox="0 0 20 20"
                              fill="none"
                              aria-hidden="true"
                              className={open ? 'h-5 w-5 rotate-180' : 'h-5 w-5'}
                            >
                              <path
                                d="M5 8l5 5 5-5"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          </button>
                        ) : null}
                      </div>

                      {open && canOpen ? (
                        <div className="mt-3 border-t border-gray-200 pt-3">
                          {ingredients.length > 0 ? (
                            <ul className="grid gap-x-6 gap-y-1 text-sm text-gray-600 sm:grid-cols-2">
                              {ingredients.map(function (line, lineIndex) {
                                return <li key={lineIndex}>{line}</li>
                              })}
                            </ul>
                          ) : null}

                          {meal.url ? (
                            <div className="mt-3 flex justify-end">
                              <a
                                href={meal.url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-sm font-semibold text-orange-500 hover:text-orange-600"
                              >
                                View full recipe
                              </a>
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                    </li>
                  )
                })}
              </ul>
            </div>
          )
        })}
      </div>
    </section>
  )
}

export default PlanPreview

import { dietLabel } from '../lib/planOptions'

function planDayTotal(day) {
  const sections = day.sections || {}

  return Object.values(sections).reduce(function (total, meal) {
    return total + (meal.calories || 0)
  }, 0)
}

function PlanPreview({ plan }) {
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
    <section className="rounded-3xl bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <h2 className="text-2xl font-bold text-gray-900">Your plan</h2>
        <p className="text-sm text-gray-500">
          {plan.days} days{diet ? ', ' + diet.toLowerCase() : ', no diet filter'}
        </p>
      </div>

      <div className="mt-6 flex flex-col gap-6">
        {days.map(function (day, index) {
          const sections = day.sections || {}
          const mealNames = Object.keys(sections)

          return (
            <div key={index}>
              <div className="flex items-baseline justify-between gap-4">
                <h3 className="font-semibold text-gray-900">Day {index + 1}</h3>
                <span className="text-sm text-gray-500">{planDayTotal(day)} kcal</span>
              </div>

              <ul className="mt-2 flex flex-col gap-2">
                {mealNames.map(function (mealName) {
                  const meal = sections[mealName] || {}

                  return (
                    <li
                      key={mealName}
                      className="flex items-baseline justify-between gap-4 rounded-2xl bg-gray-100 px-4 py-3"
                    >
                      <div>
                        <p className="text-sm text-gray-500">{mealName}</p>
                        <p className="text-sm font-medium text-gray-900">{meal.label}</p>
                      </div>
                      <span className="shrink-0 text-sm text-gray-900">
                        {meal.calories || 0} kcal
                      </span>
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

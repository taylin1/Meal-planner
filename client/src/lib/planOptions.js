export const DAYS = [1, 2, 3, 4, 5, 6, 7]

export const MEALS = ['Breakfast', 'Lunch', 'Dinner']

// Values must match the allowlist in server/src/lib/mealPlanBuilder.js
export const DIETS = [
  { label: 'Vegetarian', value: 'vegetarian' },
  { label: 'Vegan', value: 'vegan' },
  { label: 'Keto', value: 'keto-friendly' },
  { label: 'Gluten-free', value: 'gluten-free' },
  { label: 'Dairy-free', value: 'dairy-free' },
  { label: 'Paleo', value: 'paleo' },
  { label: 'Peanut-free', value: 'peanut-free' }
]

export function dietLabel(value) {
  const diet = DIETS.find(function (item) {
    return item.value === value
  })

  return diet ? diet.label : null
}

export function planTitle(plan) {
  const meals = plan.meals_included || []

  if (meals.length === MEALS.length) {
    return plan.days + ' days of all meals'
  }

  return plan.days + ' days of ' + meals.join(' and ').toLowerCase()
}

export function planSubtitle(plan) {
  const diet = dietLabel((plan.health_labels || [])[0])
  const created = new Date(plan.created_at).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short'
  })

  return (diet || 'No diet filter') + ', created ' + created
}

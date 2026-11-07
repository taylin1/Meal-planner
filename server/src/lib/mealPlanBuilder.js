// Fixed calorie ranges per meal — v1 keeps these as sensible defaults
// rather than making the user configure nutrition targets manually
const MEAL_CALORIES = {
  Breakfast: { min: 300, max: 600 },
  Lunch:     { min: 400, max: 800 },
  Dinner:    { min: 400, max: 900 }
}

// Dish types accepted per meal slot
// Edamam uses these to filter recipes appropriate for each meal
const MEAL_DISH_TYPES = {
  Breakfast: ['drinks', 'egg', 'bread', 'pancake', 'cereals', 'biscuits and cookies'],
  Lunch:     ['main course', 'pasta', 'egg', 'salad', 'soup', 'sandwiches', 'pizza'],
  Dinner:    ['main course', 'pasta', 'egg', 'salad', 'seafood', 'pizza']
}

// Meal slot types Edamam uses to categorise recipes
const MEAL_TYPES = {
  Breakfast: ['breakfast'],
  Lunch:     ['lunch/dinner'],
  Dinner:    ['lunch/dinner']
}

// The only diets the app offers. "low-carb" is intentionally absent — Edamam
// treats it as a diet label, not a health label, so it would be rejected.
const HEALTH_LABELS = [
  'vegetarian',
  'vegan',
  'keto-friendly',
  'gluten-free',
  'dairy-free',
  'paleo',
  'peanut-free'
]

const MEAL_NAMES = ['Breakfast', 'Lunch', 'Dinner']

// Checks what React sent and returns only values we know Edamam accepts.
// Returns { error } on bad input, or { value } with the cleaned choices.
function parsePlanInput(body) {
  const input = body || {}
  const days = input.days
  const meals = input.meals
  const healthLabels = input.healthLabels

  if (!Number.isInteger(days) || days < 1 || days > 7) {
    return { error: 'Days must be a whole number from 1 to 7' }
  }

  if (!Array.isArray(meals) || meals.length === 0) {
    return { error: 'Pick at least one meal: Breakfast, Lunch or Dinner' }
  }

  const cleanMeals = []

  for (const meal of meals) {
    if (!MEAL_NAMES.includes(meal)) {
      return { error: 'One of those meals is not supported' }
    }

    if (cleanMeals.includes(meal)) {
      return { error: 'Pick each meal only once' }
    }

    cleanMeals.push(meal)
  }

  if (healthLabels !== undefined && healthLabels !== null && !Array.isArray(healthLabels)) {
    return { error: 'That diet is not supported' }
  }

  const cleanLabels = healthLabels || []

  if (cleanLabels.length > 1) {
    return { error: 'Pick one diet at a time' }
  }

  if (cleanLabels.length === 1 && !HEALTH_LABELS.includes(cleanLabels[0])) {
    return { error: 'That diet is not supported' }
  }

  return {
    value: {
      days,
      meals: cleanMeals,
      healthLabels: cleanLabels.slice()
    }
  }
}

function buildMealPlanRequest({ days, meals, healthLabels }) {

  // Build each section dynamically based on which meals the user toggled on
   const sections = {}
  let dailyMin = 0
  let dailyMax = 0

  meals.forEach(function (meal) {
    sections[meal] = {
      accept: {
        all: [
          { dish: MEAL_DISH_TYPES[meal] },
          { meal: MEAL_TYPES[meal] }
        ]
      },
      fit: {
        ENERC_KCAL: MEAL_CALORIES[meal]
      }
    }

    dailyMin += MEAL_CALORIES[meal].min
    dailyMax += MEAL_CALORIES[meal].max
  })

  const request = {
    size: days,
    plan: {
      ...(healthLabels.length > 0 && {
        accept: {
          all: [{ health: healthLabels }]
        }
      }),
      fit: {
        ENERC_KCAL: { min: dailyMin, max: dailyMax }
      },
      sections
    }
  }

  return request
}

module.exports = { buildMealPlanRequest, parsePlanInput, HEALTH_LABELS }
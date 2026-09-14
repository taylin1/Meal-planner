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

function buildMealPlanRequest({ days, meals, healthLabels }) {

  // Build each section dynamically based on which meals the user toggled on
  const sections = {}

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
  })

  const request = {
    size: days,
    plan: {
      // Only include health labels if the user selected any —
      // an empty array causes Edamam to reject the request
      ...(healthLabels.length > 0 && {
        accept: {
          all: [{ health: healthLabels }]
        }
      }),
      fit: {
        ENERC_KCAL: { min: 1000, max: 2000 }
      },
      sections
    }
  }

  return request
}

module.exports = { buildMealPlanRequest }
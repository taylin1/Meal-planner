function buildMealPlanRequest({ days, meals, healthLabels }) {
  return {
    size: days
  }
} 

module.exports = { buildMealPlanRequest };
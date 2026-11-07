const { buildMealPlanRequest, parsePlanInput } = require('./mealPlanBuilder')

describe('buildMealPlanRequest', function () {
  test('builds one section per selected meal', function () {
    const request = buildMealPlanRequest({
      days: 3,
      meals: ['Breakfast', 'Lunch'],
      healthLabels: []
    })

    expect(request.size).toBe(3)
    expect(Object.keys(request.plan.sections)).toEqual(['Breakfast', 'Lunch'])

    expect(request.plan.sections.Breakfast.accept.all).toEqual([
      { dish: ['drinks', 'egg', 'bread', 'pancake', 'cereals', 'biscuits and cookies'] },
      { meal: ['breakfast'] }
    ])
    expect(request.plan.sections.Breakfast.fit.ENERC_KCAL).toEqual({ min: 300, max: 600 })
    expect(request.plan.sections.Lunch.fit.ENERC_KCAL).toEqual({ min: 400, max: 800 })

    // Daily total is the sum of the selected meals' ranges
    expect(request.plan.fit.ENERC_KCAL).toEqual({ min: 700, max: 1400 })
  })

  test('leaves out the diet filter when no diet was picked', function () {
    const request = buildMealPlanRequest({ days: 2, meals: ['Dinner'], healthLabels: [] })

    expect(request.plan.accept).toBeUndefined()
  })

  test('passes a picked diet through as a health label', function () {
    const request = buildMealPlanRequest({
      days: 2,
      meals: ['Dinner'],
      healthLabels: ['keto-friendly']
    })

    expect(request.plan.accept).toEqual({ all: [{ health: ['keto-friendly'] }] })
  })
})

describe('parsePlanInput', function () {
  test('accepts valid choices and normalises missing diets', function () {
    const result = parsePlanInput({ days: 3, meals: ['Breakfast', 'Lunch'] })

    expect(result.error).toBeUndefined()
    expect(result.value).toEqual({
      days: 3,
      meals: ['Breakfast', 'Lunch'],
      healthLabels: []
    })
  })

  test('accepts the shortest and longest allowed plans', function () {
    expect(parsePlanInput({ days: 1, meals: ['Lunch'] }).value.days).toBe(1)
    expect(parsePlanInput({ days: 7, meals: ['Lunch'] }).value.days).toBe(7)
  })

  test('accepts one supported diet', function () {
    const result = parsePlanInput({ days: 3, meals: ['Lunch'], healthLabels: ['paleo'] })

    expect(result.value.healthLabels).toEqual(['paleo'])
  })

  test('rejects day counts outside 1-7 or not whole numbers', function () {
    const badDays = [0, 8, 2.5, '3', null, undefined]

    badDays.forEach(function (days) {
      expect(parsePlanInput({ days: days, meals: ['Lunch'] }).error).toBeTruthy()
    })
  })

  test('rejects empty, unsupported, or repeated meals', function () {
    expect(parsePlanInput({ days: 3, meals: [] }).error).toBeTruthy()
    expect(parsePlanInput({ days: 3, meals: 'Lunch' }).error).toBeTruthy()
    expect(parsePlanInput({ days: 3, meals: ['Snack'] }).error).toBeTruthy()
    expect(parsePlanInput({ days: 3, meals: ['Lunch', 'Lunch'] }).error).toBeTruthy()
  })

  test('rejects unsupported diets and more than one diet', function () {
    expect(parsePlanInput({ days: 3, meals: ['Lunch'], healthLabels: ['low-carb'] }).error)
      .toBeTruthy()
    expect(parsePlanInput({ days: 3, meals: ['Lunch'], healthLabels: ['vegan', 'paleo'] }).error)
      .toBeTruthy()
    expect(parsePlanInput({ days: 3, meals: ['Lunch'], healthLabels: 'vegan' }).error)
      .toBeTruthy()
  })

  test('returns cleaned values only', function () {
    const result = parsePlanInput({
      days: 2,
      meals: ['Dinner'],
      healthLabels: ['vegan'],
      admin: true
    })

    expect(result.value).toEqual({ days: 2, meals: ['Dinner'], healthLabels: ['vegan'] })
  })
})

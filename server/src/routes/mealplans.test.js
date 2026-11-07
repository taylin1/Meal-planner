jest.mock('../lib/supabaseClient.js', function () {
  return {
    from: jest.fn(),
    auth: { getUser: jest.fn() }
  }
})

const express = require('express')
const request = require('supertest')
const supabase = require('../lib/supabaseClient.js')
const mealPlansRoute = require('./mealplans.js')

const USER_ID = 'user-1'
const PLAN_ID = '11111111-2222-3333-4444-555555555555'

function makeApp() {
  const app = express()
  app.use(express.json())
  app.use('/api/meal-plans', mealPlansRoute)
  return app
}

function jsonResponse(body, ok) {
  return {
    ok: ok !== false,
    json: async function () {
      return body
    }
  }
}

function selectResponse() {
  return {
    selection: [
      {
        sections: {
          Breakfast: { _links: { self: { href: 'https://example.com/recipes/1' } } }
        }
      }
    ]
  }
}

function recipeResponse() {
  return {
    recipe: {
      label: 'Berry oat bowl',
      image: 'https://example.com/oat.jpg',
      calories: 840,
      yield: 2,
      ingredientLines: ['1 cup rolled oats'],
      url: 'https://example.com/oat'
    }
  }
}

function insertBuilder(savedPlan) {
  const single = jest.fn().mockResolvedValue({ data: savedPlan, error: null })
  const select = jest.fn(function () {
    return { single: single }
  })
  const insert = jest.fn(function () {
    return { select: select }
  })

  supabase.from.mockReturnValue({ insert: insert })

  return { insert: insert, select: select, single: single }
}

beforeAll(function () {
  jest.spyOn(console, 'log').mockImplementation(function () {})
  jest.spyOn(console, 'error').mockImplementation(function () {})
})

beforeEach(function () {
  jest.clearAllMocks()
  global.fetch = jest.fn()
  supabase.auth.getUser.mockResolvedValue({
    data: { user: { id: USER_ID } },
    error: null
  })
})

describe('POST /api/meal-plans', function () {
  test('rejects a request with no token', async function () {
    const response = await request(makeApp())
      .post('/api/meal-plans')
      .send({ days: 3, meals: ['Lunch'] })

    expect(response.status).toBe(401)
    expect(global.fetch).not.toHaveBeenCalled()
  })

  test('rejects invalid choices before calling Edamam', async function () {
    const badInputs = [
      { days: 0, meals: ['Lunch'] },
      { days: 8, meals: ['Lunch'] },
      { days: 2.5, meals: ['Lunch'] },
      { days: '3', meals: ['Lunch'] },
      { days: 3, meals: [] },
      { days: 3, meals: ['Snack'] },
      { days: 3, meals: ['Lunch', 'Lunch'] },
      { days: 3, meals: ['Lunch'], healthLabels: ['low-carb'] },
      { days: 3, meals: ['Lunch'], healthLabels: ['vegan', 'paleo'] }
    ]

    for (const body of badInputs) {
      const response = await request(makeApp())
        .post('/api/meal-plans')
        .set('Authorization', 'Bearer token')
        .send(body)

      expect(response.status).toBe(400)
      expect(response.body.error).toBeTruthy()
    }

    expect(global.fetch).not.toHaveBeenCalled()
  })

  test('generates, saves, and returns a plan', async function () {
    global.fetch
      .mockResolvedValueOnce(jsonResponse(selectResponse()))
      .mockResolvedValueOnce(jsonResponse(recipeResponse()))

    const savedPlan = {
      id: PLAN_ID,
      user_id: USER_ID,
      days: 3,
      meals_included: ['Breakfast'],
      health_labels: [],
      plan_data: [{ sections: { Breakfast: { label: 'Berry oat bowl', calories: 420 } } }]
    }
    const db = insertBuilder(savedPlan)

    const response = await request(makeApp())
      .post('/api/meal-plans')
      .set('Authorization', 'Bearer token')
      .send({ days: 3, meals: ['Breakfast'], healthLabels: [] })

    expect(response.status).toBe(201)
    expect(response.body).toEqual(savedPlan)

    const edamamBody = JSON.parse(global.fetch.mock.calls[0][1].body)
    expect(edamamBody.size).toBe(3)
    expect(edamamBody.plan.sections.Breakfast).toBeTruthy()
    expect(edamamBody.plan.accept).toBeUndefined()

    expect(db.insert).toHaveBeenCalledWith({
      user_id: USER_ID,
      days: 3,
      meals_included: ['Breakfast'],
      health_labels: [],
      plan_data: [
        {
          sections: {
            Breakfast: {
              label: 'Berry oat bowl',
              image: 'https://example.com/oat.jpg',
              calories: 420,
              ingredientLines: ['1 cup rolled oats'],
              url: 'https://example.com/oat'
            }
          }
        }
      ]
    })
  })

  test('returns 502 when Edamam rejects the request', async function () {
    global.fetch.mockResolvedValueOnce(jsonResponse({ message: 'nope' }, false))

    const response = await request(makeApp())
      .post('/api/meal-plans')
      .set('Authorization', 'Bearer token')
      .send({ days: 3, meals: ['Lunch'] })

    expect(response.status).toBe(502)
    expect(supabase.from).not.toHaveBeenCalled()
  })

  test('returns 422 when Edamam has no plan for those choices', async function () {
    global.fetch.mockResolvedValueOnce(jsonResponse({ selection: [] }))

    const response = await request(makeApp())
      .post('/api/meal-plans')
      .set('Authorization', 'Bearer token')
      .send({ days: 3, meals: ['Lunch'] })

    expect(response.status).toBe(422)
    expect(supabase.from).not.toHaveBeenCalled()
  })
})

describe('GET /api/meal-plans', function () {
  test('returns only the logged-in user plans, newest first', async function () {
    const plans = [{ id: PLAN_ID, days: 3 }]
    const order = jest.fn().mockResolvedValue({ data: plans, error: null })
    const eq = jest.fn(function () {
      return { order: order }
    })
    const select = jest.fn(function () {
      return { eq: eq }
    })
    supabase.from.mockReturnValue({ select: select })

    const response = await request(makeApp())
      .get('/api/meal-plans')
      .set('Authorization', 'Bearer token')

    expect(response.status).toBe(200)
    expect(response.body).toEqual(plans)
    expect(eq).toHaveBeenCalledWith('user_id', USER_ID)
    expect(order).toHaveBeenCalledWith('created_at', { ascending: false })
  })

  test('returns 500 when the database fails', async function () {
    const order = jest.fn().mockResolvedValue({ data: null, error: { message: 'boom' } })
    const eq = jest.fn(function () {
      return { order: order }
    })
    const select = jest.fn(function () {
      return { eq: eq }
    })
    supabase.from.mockReturnValue({ select: select })

    const response = await request(makeApp())
      .get('/api/meal-plans')
      .set('Authorization', 'Bearer token')

    expect(response.status).toBe(500)
  })
})

describe('DELETE /api/meal-plans/:id', function () {
  function deleteBuilder(result) {
    const select = jest.fn().mockResolvedValue(result)
    const eqUser = jest.fn(function () {
      return { select: select }
    })
    const eqId = jest.fn(function () {
      return { eq: eqUser }
    })
    const remove = jest.fn(function () {
      return { eq: eqId }
    })
    supabase.from.mockReturnValue({ delete: remove })

    return { remove: remove, eqId: eqId, eqUser: eqUser, select: select }
  }

  test('deletes the plan and returns 204', async function () {
    const db = deleteBuilder({ data: [{ id: PLAN_ID }], error: null })

    const response = await request(makeApp())
      .delete(`/api/meal-plans/${PLAN_ID}`)
      .set('Authorization', 'Bearer token')

    expect(response.status).toBe(204)
    expect(db.eqId).toHaveBeenCalledWith('id', PLAN_ID)
    expect(db.eqUser).toHaveBeenCalledWith('user_id', USER_ID)
  })

  test('returns 404 when no plan matched that user and id', async function () {
    deleteBuilder({ data: [], error: null })

    const response = await request(makeApp())
      .delete(`/api/meal-plans/${PLAN_ID}`)
      .set('Authorization', 'Bearer token')

    expect(response.status).toBe(404)
  })

  test('returns 400 for an id that is not a UUID', async function () {
    const response = await request(makeApp())
      .delete('/api/meal-plans/not-a-uuid')
      .set('Authorization', 'Bearer token')

    expect(response.status).toBe(400)
    expect(supabase.from).not.toHaveBeenCalled()
  })

  test('rejects a request with no token', async function () {
    const response = await request(makeApp()).delete(`/api/meal-plans/${PLAN_ID}`)

    expect(response.status).toBe(401)
    expect(supabase.from).not.toHaveBeenCalled()
  })
})

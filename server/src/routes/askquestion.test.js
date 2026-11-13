// Mock @qvac/sdk before any require so the module never tries to load weights.
// { virtual: true } is required because the package is not installed in node_modules yet.
jest.mock('@qvac/sdk', function () {
  return {
    loadModel: jest.fn(),
    completion: jest.fn(),
    QWEN3_600M_INST_Q4: 'mock-model-src'
  }
}, { virtual: true })

// Mock qvacModel so we can control getModelId() in each test.
// { virtual: true } because qvacModel itself requires @qvac/sdk which is virtual.
jest.mock('../lib/qvacModel.js', function () {
  return {
    startModel: jest.fn(),
    getModelId: jest.fn()
  }
}, { virtual: true })

// Mock supabaseClient so verifyToken can call auth.getUser
jest.mock('../lib/supabaseClient.js', function () {
  return {
    auth: { getUser: jest.fn() }
  }
})

const express = require('express')
const request = require('supertest')
const { completion } = require('@qvac/sdk')
const { getModelId } = require('../lib/qvacModel.js')
const supabase = require('../lib/supabaseClient.js')
const askQuestionRoute = require('./askquestion.js')

const FAKE_MODEL_ID = 'loaded-model-id'
const FAKE_ANSWER = 'Chicken has about 31 g of protein per 100 g.'

// completion() returns a CompletionRun object, not a string: the route reads
// the aggregated text from `await run.final` (final.contentText).
function makeRun(contentText) {
  return {
    final: Promise.resolve({ contentText: contentText }),
    tokenStream: (async function* () {
      yield contentText
    })()
  }
}

function makeApp() {
  const app = express()
  app.use(express.json())
  app.use('/api/meal-plans', askQuestionRoute)
  return app
}

// Silence console output from the route / middleware under test
beforeAll(function () {
  jest.spyOn(console, 'log').mockImplementation(function () {})
  jest.spyOn(console, 'error').mockImplementation(function () {})
})

beforeEach(function () {
  jest.clearAllMocks()

  // Default: user is authenticated
  supabase.auth.getUser.mockResolvedValue({
    data: { user: { id: 'user-1' } },
    error: null
  })

  // Default: model is loaded
  getModelId.mockReturnValue(FAKE_MODEL_ID)

  // Default: completion returns a run whose final content is the answer
  completion.mockReturnValue(makeRun(FAKE_ANSWER))
})

describe('POST /api/meal-plans/ask', function () {
  test('returns 401 when no auth token is provided', async function () {
    const response = await request(makeApp())
      .post('/api/meal-plans/ask')
      .send({ question: 'How much protein does chicken have?' })

    expect(response.status).toBe(401)
    expect(completion).not.toHaveBeenCalled()
  })

  test('returns 400 for an off-topic question', async function () {
    const response = await request(makeApp())
      .post('/api/meal-plans/ask')
      .set('Authorization', 'Bearer token')
      .send({ question: 'What is the capital of France?' })

    expect(response.status).toBe(400)
    expect(response.body.error).toBe('Please ask a food or health related question.')
    expect(completion).not.toHaveBeenCalled()
  })

  test('returns 400 when question field is missing', async function () {
    const response = await request(makeApp())
      .post('/api/meal-plans/ask')
      .set('Authorization', 'Bearer token')
      .send({})

    expect(response.status).toBe(400)
    expect(response.body.error).toBe('Please provide a question.')
    expect(completion).not.toHaveBeenCalled()
  })

  test('returns 503 when the model is not yet loaded', async function () {
    getModelId.mockReturnValue(null)

    const response = await request(makeApp())
      .post('/api/meal-plans/ask')
      .set('Authorization', 'Bearer token')
      .send({ question: 'How many calories are in an apple?' })

    expect(response.status).toBe(503)
    expect(response.body.error).toBe('Model is still loading. Please try again in a moment.')
    expect(completion).not.toHaveBeenCalled()
  })

  test('returns 200 with the answer for a valid food question', async function () {
    const response = await request(makeApp())
      .post('/api/meal-plans/ask')
      .set('Authorization', 'Bearer token')
      .send({ question: 'How much protein does chicken have?' })

    expect(response.status).toBe(200)
    expect(response.body.answer).toBe(FAKE_ANSWER)

    const params = completion.mock.calls[0][0]
    expect(params.modelId).toBe(FAKE_MODEL_ID)
    expect(params.stream).toBe(true)
    expect(params.captureThinking).toBe(true)
    expect(params.history[1].role).toBe('user')
    expect(params.history[1].content).toContain('How much protein does chicken have?')
  })

  test('accepts a question that names a food but no generic nutrition word', async function () {
    const response = await request(makeApp())
      .post('/api/meal-plans/ask')
      .set('Authorization', 'Bearer token')
      .send({ question: 'does chicken have protien in it' })

    expect(response.status).toBe(200)
    expect(response.body.answer).toBe(FAKE_ANSWER)
  })

  test('returns 400 when a keyword only appears inside another word', async function () {
    const response = await request(makeApp())
      .post('/api/meal-plans/ask')
      .set('Authorization', 'Bearer token')
      .send({ question: 'What is the weather like today?' })

    expect(response.status).toBe(400)
    expect(response.body.error).toBe('Please ask a food or health related question.')
  })

  test('returns 500 when the model returns an empty answer', async function () {
    completion.mockReturnValue(makeRun('   '))

    const response = await request(makeApp())
      .post('/api/meal-plans/ask')
      .set('Authorization', 'Bearer token')
      .send({ question: 'How many calories are in an apple?' })

    expect(response.status).toBe(500)
    expect(response.body.error).toBe('Received empty response from model.')
  })
})

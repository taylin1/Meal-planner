import { supabase } from './supabaseClient'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

// The token is read at call time so a refreshed session is always used
async function getAuthHeaders() {
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    throw new Error('Your session expired. Please log in again.')
  }

  return {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + session.access_token
  }
}

async function readError(response) {
  try {
    const data = await response.json()
    return data.error || 'Something went wrong. Please try again.'
  } catch {
    return 'Something went wrong. Please try again.'
  }
}

async function callApi(path, options) {
  const headers = await getAuthHeaders()
  let response

  try {
    response = await fetch(API_URL + path, { ...options, headers })
  } catch {
    throw new Error('Could not reach the server. Is it running?')
  }

  if (!response.ok) {
    throw new Error(await readError(response))
  }

  return response
}

export async function generateMealPlan(choices) {
  const response = await callApi('/api/meal-plans', {
    method: 'POST',
    body: JSON.stringify(choices)
  })

  return response.json()
}

export async function fetchMealPlans() {
  const response = await callApi('/api/meal-plans')

  return response.json()
}

export async function deleteMealPlan(id) {
  await callApi('/api/meal-plans/' + id, { method: 'DELETE' })
}

import { isFoodOrHealthQuestion } from './foodHealthGuard'

// Both engines use this text, so answers read the same whichever one runs.
export const SYSTEM_PROMPT =
  'You are a helpful nutrition and health assistant. Only answer questions\n' +
  'about food, diet, nutrition, and health. Answer clearly and concisely in\n' +
  '4 to 8 sentences.'

export const MAX_QUESTION_LENGTH = 300

// Checks the question before any engine runs. Returns the trimmed question and
// throws a message that is safe to show the user.
export function checkQuestion(question, meal) {
  if (typeof question !== 'string' || question.trim() === '') {
    throw new Error('Please provide a question.')
  }

  const trimmed = question.trim()

  if (trimmed.length > MAX_QUESTION_LENGTH) {
    throw new Error('Please keep your question under ' + MAX_QUESTION_LENGTH + ' characters.')
  }

  // With a meal attached there is already cooking context, so the keyword
  // guard would only reject valid follow-up questions.
  if (!meal && !isFoodOrHealthQuestion(trimmed)) {
    throw new Error('Please ask a food or health related question.')
  }

  return trimmed
}

export function buildUserMessage(question, meal) {
  let message = question

  if (meal && meal.label) {
    const ingredients = Array.isArray(meal.ingredients) ? meal.ingredients.join(', ') : ''

    message = 'Meal: ' + meal.label + '. '

    if (ingredients) {
      message += 'Ingredients: ' + ingredients + '. '
    }

    message += 'Question: ' + question
  }

  // Qwen3 skips its long reasoning block when the message ends with this
  // switch. WebLLM also gets enable_thinking: false, wllama only has this.
  return message + ' /no_think'
}

export function buildMessages(question, meal) {
  return [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: buildUserMessage(question, meal) }
  ]
}

// The model can still emit a thinking block. Strip it so the page only ever
// shows plain prose.
export function stripThinking(text) {
  if (!text) return ''

  return text.replace(/<think(?:ing)?>[\s\S]*?<\/think(?:ing)?>/gi, '').trim()
}

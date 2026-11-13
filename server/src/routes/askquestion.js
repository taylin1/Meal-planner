const express = require('express')
const router = express.Router()
const { verifyToken } = require('../middleware/auth.js')
const { getModelId } = require('../lib/qvacModel.js')
const { completion } = require('@qvac/sdk')

// Keywords that mark a question as food- or health-related.
// A whole-word match on any of them passes the topic guard.
const FOOD_HEALTH_KEYWORDS = [
  // general eating / nutrition
  'food', 'eat', 'ate', 'meal', 'diet', 'calorie', 'kcal',
  'nutrition', 'nutrient', 'nutritional', 'protein', 'carb',
  'carbohydrate', 'fat', 'fatty', 'vitamin', 'mineral', 'fibre', 'fiber',
  'health', 'healthy', 'weight', 'recipe', 'ingredient', 'drink', 'water',
  'vegetable', 'veggie', 'fruit', 'sugar', 'sodium', 'salt', 'salty',
  'cholesterol', 'omega', 'antioxidant', 'supplement', 'vegan',
  'vegetarian', 'keto', 'gluten', 'dairy', 'lactose', 'allergy',
  'intolerance', 'portion', 'serving', 'breakfast', 'lunch', 'dinner',
  'snack', 'cook', 'cooking', 'dish', 'grain', 'seed', 'cereal',

  // specific foods
  'chicken', 'beef', 'pork', 'lamb', 'turkey', 'steak', 'bacon',
  'sausage', 'ham', 'fish', 'salmon', 'tuna', 'shrimp', 'prawn',
  'seafood', 'shellfish', 'egg', 'rice', 'bread', 'pasta', 'noodle',
  'potato', 'banana', 'apple', 'orange', 'berry', 'berries', 'grape',
  'avocado', 'spinach', 'broccoli', 'carrot', 'tomato', 'onion', 'garlic',
  'bean', 'lentil', 'chickpea', 'tofu', 'soy', 'milk', 'cheese', 'yogurt',
  'yoghurt', 'butter', 'oil', 'nut', 'peanut', 'almond', 'walnut', 'oat',
  'corn', 'wheat', 'honey', 'coffee', 'tea', 'juice', 'soda', 'chocolate',
  'pizza', 'burger', 'sandwich', 'salad', 'soup', 'sauce', 'mushroom',
  'cucumber', 'pepper', 'lemon', 'mango', 'pineapple', 'watermelon',
  'coconut',

  // health topics
  'calcium', 'iron', 'potassium', 'zinc', 'magnesium', 'b12', 'probiotic',
  'digestion', 'digest', 'immune', 'metabolism', 'muscle', 'energy',
  'hydration', 'hydrate', 'diabetes', 'diabetic', 'obesity', 'obese',
  'anemia', 'inflammation', 'blood sugar', 'blood pressure'
]

// Whole-word match (plus a regular plural) so "eat" no longer matches
// "weather", and a food can be named without a generic nutrition keyword.
const FOOD_HEALTH_PATTERN = new RegExp(
  '\\b(?:' + FOOD_HEALTH_KEYWORDS.join('|') + ')(?:s|es)?\\b',
  'i'
)

function isFoodOrHealthQuestion(question) {
  return FOOD_HEALTH_PATTERN.test(question)
}

router.post('/ask', verifyToken, async function (req, res) {
  try {
    const question = req.body && req.body.question

    if (!question || typeof question !== 'string' || question.trim() === '') {
      return res.status(400).json({ error: 'Please provide a question.' })
    }

    if (!isFoodOrHealthQuestion(question)) {
      return res.status(400).json({
        error: 'Please ask a food or health related question.'
      })
    }

    const modelId = getModelId()

    if (!modelId) {
      return res.status(503).json({
        error: 'Model is still loading. Please try again in a moment.'
      })
    }

    const history = [
      {
        role: 'system',
        content: 'You are a helpful nutrition and health assistant. Only answer questions about food, diet, nutrition, and health. Answer clearly and concisely in 2–4 sentences.'
      },
      {
        role: 'user',
        // Qwen3 is a hybrid reasoning model. `/no_think` skips the long
        //  thinking block, which cuts a local CPU answer from ~17s to ~2s.
        content: question + ' /no_think'
      }
    ]

    // captureThinking separates the model's  thinking reasoning from its real
    // answer, so `contentText` is clean prose instead of the raw reasoning.
    const result = completion({
      modelId: modelId,
      history: history,
      stream: true,
      captureThinking: true
    })

    const final = await result.final
    const answer = final.contentText

    if (!answer || answer.trim().length === 0) {
      return res.status(500).json({ error: 'Received empty response from model.' })
    }

    return res.status(200).json({ answer: answer.trim() })
  } catch (err) {
    console.error('Error in /ask endpoint:', err)
    return res.status(500).json({ error: 'Could not generate an answer. Please try again.' })
  }
})

module.exports = router

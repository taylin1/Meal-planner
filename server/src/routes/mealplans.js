const express = require('express')
const router = express.Router()
const supabase = require('../lib/supabaseClient.js')
const { verifyToken } = require('../middleware/auth.js')
const { buildMealPlanRequest } = require('../lib/mealPlanBuilder.js')

const EDAMAM_APP_ID = process.env.EDAMAM_APP_ID
const EDAMAM_APP_KEY = process.env.EDAMAM_APP_KEY

// Free plan only allows 10 account users/month, so every request shares one id
const EDAMAM_USER_ID = 'meal-planner-app-user'

// Built once, reused for every Edamam call
const EDAMAM_AUTH = 'Basic ' + Buffer.from(`${EDAMAM_APP_ID}:${EDAMAM_APP_KEY}`).toString('base64')

// Goes to one recipe link and returns the real recipe
async function getRecipe(link) {
  const response = await fetch(link, {
    headers: {
      'Edamam-Account-User': EDAMAM_USER_ID,
      'Authorization': EDAMAM_AUTH
    }
  })

  const data = await response.json()
  return data.recipe
}

// Swaps every recipe link in the plan for the real recipe
async function attachRecipeDetails(selectData) {
  const finishedDays = []

  for (const day of selectData.selection) {
    const thisDaysMeals = {}

    for (const mealName in day.sections) {
      const link = day.sections[mealName]._links.self.href
      const recipe = await getRecipe(link)

       const servings = recipe.yield || 1

      thisDaysMeals[mealName] = {
        label: recipe.label,
        image: recipe.image,
        calories: Math.round(recipe.calories/ servings),
        ingredientLines: recipe.ingredientLines,
        url: recipe.url
      }
    }

    finishedDays.push({ sections: thisDaysMeals })
  }

  return finishedDays
}

router.post('/', verifyToken, async function (req, res) {

  // Step 1 - Receive days, meals and healthLabels from React
  const { days, meals, healthLabels } = req.body

  // Step 2 - Validate the input
  if (!days || !meals || meals.length === 0) {
    return res.status(400).json({ error: 'days and at least one meal are required' })
  }

  // Step 3 - Build the Edamam request body
  const requestBody = buildMealPlanRequest({ days, meals, healthLabels: healthLabels || [] })

  try {
    // Step 4 - Call Edamam's select endpoint
    const selectResponse = await fetch(
      `https://api.edamam.com/api/meal-planner/v1/${EDAMAM_APP_ID}/select`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Edamam-Account-User': EDAMAM_USER_ID,
          'Authorization': EDAMAM_AUTH
        },
        body: JSON.stringify(requestBody)
      }
    )

    // Step 5 - Edamam returns recipe links for each day/meal
    const selectData = await selectResponse.json()
    
    console.log('Select response:', JSON.stringify(selectData, null, 2))

    if (!selectResponse.ok) {
      console.error('Edamam select error:', selectData)
      return res.status(502).json({ error: 'Failed to generate meal plan' })
    }

        if (!selectData.selection || selectData.selection.length === 0) {
      console.error('Edamam returned no plan:', selectData)
      return res.status(422).json({ error: 'Could not build a plan with those choices. Try different options.' })
    }

    // Step 6 - Swap the links for the real recipes
    const daysWithRecipes = await attachRecipeDetails(selectData)

    // Step 7 - Save the complete plan to Supabase
    const { data: savedPlan, error: dbError } = await supabase
      .from('meal_plans')
      .insert({
        user_id: req.user.id,
        days,
        meals_included: meals,
        health_labels: healthLabels || [],
        plan_data: daysWithRecipes
      })
      .select()
      .single()

    if (dbError) {
      return res.status(500).json({ error: 'Failed to save meal plan' })
    }

    // Step 8 - Return the plan to React
    return res.status(201).json(savedPlan)

  } catch (err) {
    console.error('Meal plan generation error:', err)
    return res.status(500).json({ error: 'Something went wrong generating your meal plan' })
  }
})

// GET /api/meal-plans - returns the logged-in user's saved plans
router.get('/', verifyToken, async function (req, res) {

  const { data: plans, error } = await supabase
    .from('meal_plans')
    .select('*')
    .eq('user_id', req.user.id)
    .order('created_at', { ascending: false })

  if (error) {
    return res.status(500).json({ error: 'Failed to fetch meal plans' })
  }

  return res.status(200).json(plans)
})

module.exports = router
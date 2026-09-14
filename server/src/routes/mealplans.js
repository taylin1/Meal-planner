const express = require ('express');
const router = express.Router();
const supabase = require('../lib/supabaseClient.js');
const {verifyToken} = require ('../middleware/auth.js')
const {buildMealPlanRequest} = require('../lib/mealPlanBuilder.js');

const EDAMAM_APP_ID = process.env.EDAMAM_APP_ID
const EDAMAM_APP_KEY = process.env.EDAMAM_APP_KEY

// Fixed shared user_id — the free plan only allows 10 account users/month
// so every request uses the same value regardless of who's logged in
const EDAMAM_USER_ID = 'meal-planner-app-user'

router.post('/', verifyToken, async function(req,res){

    //Step 1 -Recieve days, meals and healthLabels form React
    const {days, meals, healthLabels} = req.body;
    
    //Step 2 - Valdate the input
    if(!days || !meals || meals.length === 0){
        res.status(404).json({error: "days and atleast one meal are required"})
    }
    
    // Step 3 — Build the Edamam request body (using our mealPlanBuilder)
    const requestBody = buildMealPlanRequest({ days, meals, healthLabels: healthLabels || [] })

    try {

         console.log('APP_ID:', EDAMAM_APP_ID)
         console.log('APP_KEY exists:', !!EDAMAM_APP_KEY)

        //Step 4 - Call edamam endpoint/ select endpoint 
        const selectResponse = await fetch(
            `https://api.edamam.com/api/meal-planner/v1/${EDAMAM_APP_ID}/select`,
            {
                method:'POST',
                headers:{
                    'Content-Type':'application/json',
                    'Edamam-Account-User': EDAMAM_USER_ID,
                    'Authorization': 'Basic ' + Buffer.from(`${EDAMAM_APP_ID}:${EDAMAM_APP_KEY}`).toString('base64')
                },
                body: JSON.stringify(requestBody)
            }
        )
         // Step 5 — Edamam returns recipe URIs assigned to each day/meal slot
    const selectData = await selectResponse.json()

    if (!selectResponse.ok) {
      console.error('Edamam select error:', selectData)
      console.error('Edamam status:', selectResponse.status)
      console.error('Edamam status text:', selectResponse.statusText)
      return res.status(502).json({ error: 'Failed to generate meal plan' })
    }

    
    // Step 6 — Look up full recipe details for each URI
    // NOTE: not implemented yet — this happens in Phase 7
    // For now selectData only contains recipe URIs, not full details

    // Step 7 — Save the complete plan to Supabase
    const { data: savedPlan, error: dbError } = await supabase
      .from('meal_plans')
      .insert({
        user_id: req.user.id,
        days,
        meals_included: meals,
        health_labels: healthLabels || [],
        plan_data: selectData
      })
      .select()
      .single()

    if (dbError) {
      return res.status(500).json({ error: 'Failed to save meal plan' })
    }

    // Step 8 — Return the plan to React
    return res.status(201).json(savedPlan)

  } catch (err) {
    console.error('Meal plan generation error:', err)
    return res.status(500).json({ error: 'Something went wrong generating your meal plan' })
  }

})

module.exports = router;
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

export function isFoodOrHealthQuestion(question) {
  return FOOD_HEALTH_PATTERN.test(question)
}

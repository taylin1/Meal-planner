## ADR-004: Store calories per serving

**Date:** 2026-10-29
**Status:** Accepted

**Context:**
Edamam's recipe calories are for the whole recipe, not one serving.
A loaf showed 4542 kcal, which is meaningless in a meal plan.

**Decision:**
Divide recipe calories by the recipe's yield (servings) before saving.
Default to 1 serving if yield is missing.

**Consequences:**
- Positive: Calories match what a person actually eats
- Negative: Depends on Edamam's yield being accurate
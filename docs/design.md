# Design spec: Meal Planner

## Feel
Light, clean, friendly. Lots of white space. Big rounded corners.
Reference screenshot: docs/design-reference.png

## Colors (Tailwind classes only)
- Page background: bg-gray-50
- Cards: bg-white, rounded-3xl, p-6, shadow-sm
- Soft areas (inputs, unselected days): bg-gray-100
- Titles: text-gray-900
- Small labels: text-gray-500
- Accent (buttons, selected day, ring): orange-500, hover:orange-600
- Errors: text-red-500 on bg-red-50

## Shapes
- Cards: rounded-3xl
- Buttons and day pills: rounded-full
- Food photos: rounded-2xl

## Type and spacing
- Page title: text-2xl font-bold
- Body text: text-sm
- Space between sections: gap-6

## Code rules
- React + Tailwind only, no extra libraries
- Named function declarations, not arrow functions
- Simple variable names
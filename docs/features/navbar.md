# Navbar (part 1)

Source: `docs/dashboard-mockup.png` — top header bar (callout badge 1).

## Goal
A shared navbar visible on the protected dashboard route:
- **Left**: white card shell, orange circular logo icon, heading "Mealify" next to it.
- **Right**: profile icon (orange circle with user initial), user name (bold), user email (muted gray), and a "Log out" button.
- Logout uses `supabase.auth.signOut()`.

## Scope (part 1 only)
Navbar shell + auth sign-out interaction. Does NOT include the rest of the dashboard
layout (plan builder, plan display, saved plans) — those are separate features.

## Behavior
- Renders only for authenticated users (inside the protected shell alongside `/dashboard`).
- Profile icon is an orange circle with the first letter of the user's name (fallback
  to "?" if name is empty).
- Name and email come from the current Supabase session/user object.
- "Log out" button calls `supabase.auth.signOut()`. On success, navigate to `/login`.
  On error, surface the error in state.
- While signing out, disable the button to avoid double-clicks.

## Visual alignment with mockup
- White rounded navbar card with subtle border/shadow.
- Orange circular logo mark + "Mealify" heading on the left.
- Orange circular avatar (initial) + bold name + muted email on the right.
- "Log out" button: rounded, orange border, orange text (matching the mockup).

## Files
- New navbar component under `client/src/Components/` (e.g. `Navbar.jsx`).
- `client/src/App.jsx` or a protected layout to render the navbar on `/dashboard`.
- `client/src/Pages/Dashboard.jsx` may be updated to use the shared shell.

## Out of scope
Plan builder UI, plan display, saved plans, meal/recipe cards, per-meal calorie ranges,
diet filters, day tabs — those belong to later parts.

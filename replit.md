# Preppa — Weeknight Meal Planner

## Overview
Preppa is a web app that reduces the mental load of weeknight dinners for busy families. It auto-generates a family-acceptable, time-realistic meal plan and a consolidated grocery list in under 60 seconds.

## Target User
Working parents (primarily moms) with multiple kids who already cook most weeknights but feel mental load around deciding what to make and building a grocery list.

## Tech Stack
- **Frontend:** React + TypeScript, Vite, Tailwind CSS, shadcn/ui, TanStack Query, Wouter, Framer Motion
- **Backend:** Express.js (TypeScript), Drizzle ORM
- **Database:** PostgreSQL (Replit built-in)
- **Auth:** Replit Auth (OpenID Connect via `openid-client` + passport)
- **AI:** OpenAI via Replit AI Integrations (`gpt-4o` for meal plan + grocery list generation)

## Core Features (MVP)
1. **Meals** — Browse preset meals or add custom family meals with ingredients
2. **Meal Plan** — AI-generated 5-day weeknight plan (Mon–Fri) using meals the family already knows
3. **Grocery List** — Auto-generated, consolidated list with:
   - Store-ready unit amounts (e.g. "2 lbs", "1 head", "1 can (14.5 oz)")
   - Pantry staples in a collapsible secondary section
   - One-tap copy-to-clipboard for sharing to Notes or text

## Deferred Features (not built yet)
- **Virtual Pantry** — Track what the user already has at home (schema + backend exist, UI removed intentionally)
- Costco / multi-store split shopping lists
- Budget optimization

## Architecture
### Key Files
- `shared/schema.ts` — All DB tables (meals, mealIngredients, mealPlans, mealPlanMeals, groceryLists, groceryListItems, pantryItems)
- `shared/routes.ts` — API contract
- `server/routes.ts` — Express route handlers + AI meal plan generation
- `server/storage.ts` — DB storage layer (DatabaseStorage class)
- `server/replit_integrations/auth/` — Replit Auth setup (session, passport, OIDC)
- `client/src/pages/Dashboard.tsx` — Main app view (Meals | Plan | Grocery List)
- `client/src/pages/Landing.tsx` — Unauthenticated landing page
- `client/src/components/GroceryListView.tsx` — Grocery list with pantry staples + copy button
- `client/src/components/MealManager.tsx` — Browse/add meals
- `client/src/components/MealPlanView.tsx` — Current plan + regenerate button

### Database Schema Notes
- `groceryListItems` has `storeUnit` (store-format quantity), `isPantryStaple` (for collapsible section), `isChecked`
- `pantryItems` table exists but is not exposed in the UI (future feature)
- Auth tables: `sessions` (connect-pg-simple) and `users` (in `shared/models/auth.ts`)

import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { isAuthenticated, registerAuthRoutes, setupAuth } from "./replit_integrations/auth";
import { z } from "zod";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  await setupAuth(app);
  registerAuthRoutes(app);

  // Public — no auth required so guests can browse meals
  app.get(api.meals.list.path, async (req: any, res) => {
    const userId = req.user?.claims?.sub;
    const meals = await storage.getMeals(userId);
    res.json(meals);
  });

  app.post(api.meals.create.path, isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const input = api.meals.create.input.parse(req.body);
      const { ingredients, ...mealData } = input;
      const meal = await storage.createMeal({ ...mealData, userId, isPreset: false }, ingredients);
      res.status(201).json(meal);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get(api.pantry.list.path, isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const items = await storage.getPantryItems(userId);
    res.json(items);
  });

  app.post(api.pantry.add.path, isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const input = api.pantry.add.input.parse(req.body);
      const item = await storage.addPantryItem({ ...input, userId });
      res.status(201).json(item);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete(api.pantry.remove.path, isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    await storage.deletePantryItem(Number(req.params.id), userId);
    res.status(204).send();
  });

  app.get(api.mealPlans.current.path, isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const plan = await storage.getCurrentMealPlan(userId);
    res.json(plan);
  });

  // Swap options — meals not currently in the active plan
  app.get(api.mealPlans.swapOptions.path, isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const excludeIds = String(req.query.excludeIds || "")
      .split(",").map(Number).filter(n => !isNaN(n) && n > 0);
    const options = await storage.getSwapOptions(userId, excludeIds);
    res.json(options);
  });

  // Swap a single meal in the current plan and regenerate grocery list
  app.patch(api.mealPlans.swap.path, isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const input = api.mealPlans.swap.input.parse(req.body);
      const plan = await storage.getCurrentMealPlan(userId);
      if (!plan) return res.status(404).json({ message: "No active plan" });

      await storage.swapMealInPlan(plan.id, input.day, input.newMealId);
      const updatedPlan = await storage.getCurrentMealPlan(userId);
      if (!updatedPlan) throw new Error("Plan not found after swap");

      // Regenerate grocery list via AI for accurate store units
      const mealsList = updatedPlan.meals.map((m: any) => ({
        name: m.meal.name,
        ingredients: m.meal.ingredients.map((i: any) => ({
          name: i.name, amount: i.amount, isPantryStaple: i.isPantryStaple
        }))
      }));

      const prompt = `
You are an AI meal planner. The family's 5-meal plan for the week has been updated.

Updated meals: ${JSON.stringify(mealsList)}

Generate a consolidated grocery list. Combine duplicate ingredients across meals and sum quantities.

For each item:
- "storeUnit": how it's sold at the store (e.g. "2 lbs", "1 head", "1 can (14.5 oz)", "1 box (16 oz)")
- "isPantryStaple": true if it's a common pantry item families likely already own (olive oil, soy sauce, pasta, rice, canned goods, spices, taco shells, bread, etc.)

Return JSON only:
{
  "groceryItems": [
    {"name": "Ground Beef", "storeUnit": "2 lbs", "isPantryStaple": false},
    {"name": "Olive Oil", "storeUnit": "1 bottle (16 oz)", "isPantryStaple": true}
  ]
}`;

      const aiRes = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" }
      });

      const content = aiRes.choices[0].message.content;
      if (!content) throw new Error("No AI content");

      const parsed = JSON.parse(content);
      // Delete old grocery list and create new one
      await storage.createGroceryList(userId, plan.id, (parsed.groceryItems || []).map((i: any) => ({
        name: i.name, storeUnit: i.storeUnit, isPantryStaple: i.isPantryStaple ?? false
      })));

      res.json(updatedPlan);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Failed to swap meal" });
    }
  });

  app.post(api.mealPlans.generate.path, isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const availableMeals = await storage.getMeals(userId);
      const recentHistory = await storage.getMealPlanHistory(userId, 4);

      const now = new Date();
      const dayOfWeek = now.getDay();
      const daysUntilMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
      const nextMonday = new Date(now);
      nextMonday.setDate(now.getDate() + daysUntilMonday);
      const weekOf = nextMonday.toISOString().split("T")[0];

      const historyContext = recentHistory.length === 0
        ? "No previous meal plans."
        : recentHistory.map((h: any, idx: number) => {
            const weekLabel = idx === 0 ? "Last week" : `${idx + 1} weeks ago`;
            const mealNames = h.meals.map((m: any) => m.meal.name).join(", ");
            return `${weekLabel}: ${mealNames}`;
          }).join("\n");

      const recentGroceries = recentHistory.length > 0
        ? await storage.getGroceryListByPlanId(recentHistory[0].id)
        : null;

      const recentlyBought = recentGroceries
        ? recentGroceries.items.filter((i: any) => !i.isPantryStaple).map((i: any) => i.name).join(", ")
        : "None";

      const prompt = `
You are an AI meal planner for busy working families. Create a 5-day weeknight meal plan (Monday to Friday) for the week of ${weekOf}.

Available Meals (with their ingredients):
${JSON.stringify(availableMeals.map(m => ({ id: m.id, name: m.name, prepTime: m.prepTimeMins, ingredients: m.ingredients.map((i: any) => ({ name: i.name, amount: i.amount, isPantryStaple: i.isPantryStaple })) })))}

Recent meal history (avoid repeating meals from the past 2 weeks):
${historyContext}

Non-staple groceries recently purchased (may still be partly available — try to use them up):
${recentlyBought}

Instructions:
1. Pick exactly 5 meals from the available meals list. Avoid repeating any meal from last week. Vary proteins and cooking styles. Try to use up recently-bought ingredients where logical.
2. Consolidate ALL ingredients across all 5 meals. Combine duplicates and sum quantities. For ingredients likely still available from last week, reduce quantity or omit if a full pack was recently purchased.
3. For each grocery item, produce a "storeUnit" describing exactly what to buy at the store (e.g. "1 lb pack", "2 cans (14.5 oz each)", "1 bunch", "1 head", "1 bag (8 oz)").
4. Classify each item as "isPantryStaple": true if it's a common household pantry item families typically already own.
5. Return JSON only:
{
  "plan": [
    {"dayOfWeek": "Monday", "mealId": 1},
    {"dayOfWeek": "Tuesday", "mealId": 2},
    {"dayOfWeek": "Wednesday", "mealId": 3},
    {"dayOfWeek": "Thursday", "mealId": 4},
    {"dayOfWeek": "Friday", "mealId": 5}
  ],
  "groceryItems": [
    {"name": "Ground Beef", "storeUnit": "2 lbs", "isPantryStaple": false},
    {"name": "Olive Oil", "storeUnit": "1 bottle (16 oz)", "isPantryStaple": true}
  ]
}`;

      const aiRes = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" }
      });

      const content = aiRes.choices[0].message.content;
      if (!content) throw new Error("No content from AI");

      const parsed = JSON.parse(content);
      const plan = await storage.createMealPlan(userId, parsed.plan, weekOf);

      const toBuy = (parsed.groceryItems || []).map((item: any) => ({
        name: item.name, storeUnit: item.storeUnit, isPantryStaple: item.isPantryStaple ?? false,
      }));

      await storage.createGroceryList(userId, plan.id, toBuy);
      res.json(plan);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Failed to generate meal plan" });
    }
  });

  app.get(api.groceryLists.current.path, isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const list = await storage.getCurrentGroceryList(userId);
    res.json(list);
  });

  app.patch(api.groceryLists.toggleItem.path, isAuthenticated, async (req: any, res) => {
    try {
      const input = api.groceryLists.toggleItem.input.parse(req.body);
      const item = await storage.toggleGroceryItem(Number(req.params.id), input.isChecked);
      res.json(item);
    } catch (err) {
      res.status(400).json({ message: "Invalid input" });
    }
  });

  app.get(api.history.get.path, isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const plans = await storage.getMealPlanHistory(userId, 12);
    const result = await Promise.all(plans.map(async (plan: any) => {
      const groceryList = await storage.getGroceryListByPlanId(plan.id);
      return { plan, groceryList };
    }));
    res.json(result);
  });

  seedDatabase().catch(console.error);
  return httpServer;
}

// ─── Seed Data ────────────────────────────────────────────────────────────────

type SeedMeal = {
  name: string; description: string; prepTimeMins: number;
  ingredients: { name: string; amount: string; isPantryStaple: boolean }[];
};

const ALL_SEED_MEALS: SeedMeal[] = [
  // ── Pasta & Italian ──────────────────────────────────────────────
  {
    name: "Spaghetti Bolognese", description: "Classic Italian pasta dish", prepTimeMins: 30,
    ingredients: [
      { name: "Spaghetti", amount: "1 lb", isPantryStaple: true },
      { name: "Ground Beef", amount: "1 lb", isPantryStaple: false },
      { name: "Tomato Sauce", amount: "24 oz", isPantryStaple: true },
    ]
  },
  {
    name: "Baked Ziti", description: "Cheesy pasta bake the whole family loves", prepTimeMins: 40,
    ingredients: [
      { name: "Ziti Pasta", amount: "1 lb", isPantryStaple: true },
      { name: "Ricotta Cheese", amount: "15 oz", isPantryStaple: false },
      { name: "Marinara Sauce", amount: "24 oz", isPantryStaple: true },
      { name: "Shredded Mozzarella", amount: "2 cups", isPantryStaple: false },
    ]
  },
  {
    name: "Chicken Alfredo", description: "Creamy pasta with tender chicken", prepTimeMins: 30,
    ingredients: [
      { name: "Fettuccine Pasta", amount: "1 lb", isPantryStaple: true },
      { name: "Chicken Breast", amount: "1 lb", isPantryStaple: false },
      { name: "Heavy Cream", amount: "1 cup", isPantryStaple: false },
      { name: "Parmesan Cheese", amount: "1 cup", isPantryStaple: false },
    ]
  },
  {
    name: "Mac and Cheese", description: "Homemade creamy mac, always a hit", prepTimeMins: 25,
    ingredients: [
      { name: "Elbow Macaroni", amount: "1 lb", isPantryStaple: true },
      { name: "Shredded Cheddar", amount: "2 cups", isPantryStaple: false },
      { name: "Milk", amount: "2 cups", isPantryStaple: false },
      { name: "Butter", amount: "4 tbsp", isPantryStaple: true },
    ]
  },
  {
    name: "Pasta Primavera", description: "Light pasta loaded with fresh veggies", prepTimeMins: 25,
    ingredients: [
      { name: "Penne Pasta", amount: "1 lb", isPantryStaple: true },
      { name: "Zucchini", amount: "1", isPantryStaple: false },
      { name: "Cherry Tomatoes", amount: "1 pint", isPantryStaple: false },
      { name: "Bell Peppers", amount: "2", isPantryStaple: false },
      { name: "Parmesan Cheese", amount: "½ cup", isPantryStaple: false },
    ]
  },
  {
    name: "Penne Arrabbiata", description: "Spicy tomato pasta, ready in 20 min", prepTimeMins: 20,
    ingredients: [
      { name: "Penne Pasta", amount: "1 lb", isPantryStaple: true },
      { name: "Crushed Tomatoes", amount: "28 oz can", isPantryStaple: true },
      { name: "Garlic", amount: "4 cloves", isPantryStaple: true },
      { name: "Red Pepper Flakes", amount: "1 tsp", isPantryStaple: true },
    ]
  },
  {
    name: "Lasagna", description: "Classic layered pasta, great for meal prep", prepTimeMins: 60,
    ingredients: [
      { name: "Lasagna Noodles", amount: "1 box", isPantryStaple: true },
      { name: "Ground Beef", amount: "1 lb", isPantryStaple: false },
      { name: "Ricotta Cheese", amount: "15 oz", isPantryStaple: false },
      { name: "Shredded Mozzarella", amount: "2 cups", isPantryStaple: false },
      { name: "Marinara Sauce", amount: "24 oz", isPantryStaple: true },
    ]
  },

  // ── Chicken ──────────────────────────────────────────────────────
  {
    name: "Chicken Stir Fry", description: "Quick and easy veggie stir fry", prepTimeMins: 20,
    ingredients: [
      { name: "Chicken Breast", amount: "1 lb", isPantryStaple: false },
      { name: "Broccoli", amount: "1 head", isPantryStaple: false },
      { name: "Soy Sauce", amount: "3 tbsp", isPantryStaple: true },
      { name: "Rice", amount: "2 cups", isPantryStaple: true },
    ]
  },
  {
    name: "Baked Chicken Thighs", description: "Juicy oven-baked chicken with crispy skin", prepTimeMins: 40,
    ingredients: [
      { name: "Chicken Thighs", amount: "2 lbs", isPantryStaple: false },
      { name: "Garlic Powder", amount: "1 tsp", isPantryStaple: true },
      { name: "Paprika", amount: "1 tsp", isPantryStaple: true },
      { name: "Olive Oil", amount: "2 tbsp", isPantryStaple: true },
    ]
  },
  {
    name: "Chicken Fajitas", description: "Sizzling skillet fajitas with peppers and onions", prepTimeMins: 25,
    ingredients: [
      { name: "Chicken Breast", amount: "1.5 lbs", isPantryStaple: false },
      { name: "Bell Peppers", amount: "3", isPantryStaple: false },
      { name: "Onion", amount: "1", isPantryStaple: true },
      { name: "Flour Tortillas", amount: "1 pack", isPantryStaple: true },
      { name: "Fajita Seasoning", amount: "1 packet", isPantryStaple: true },
    ]
  },
  {
    name: "Honey Garlic Chicken", description: "Sweet and savory glazed chicken over rice", prepTimeMins: 25,
    ingredients: [
      { name: "Chicken Breast", amount: "1.5 lbs", isPantryStaple: false },
      { name: "Honey", amount: "3 tbsp", isPantryStaple: true },
      { name: "Soy Sauce", amount: "2 tbsp", isPantryStaple: true },
      { name: "Garlic", amount: "4 cloves", isPantryStaple: true },
      { name: "Rice", amount: "2 cups", isPantryStaple: true },
    ]
  },
  {
    name: "Chicken Tikka Masala", description: "Creamy tomato curry everyone loves", prepTimeMins: 35,
    ingredients: [
      { name: "Chicken Breast", amount: "1.5 lbs", isPantryStaple: false },
      { name: "Tikka Masala Sauce", amount: "15 oz jar", isPantryStaple: false },
      { name: "Heavy Cream", amount: "½ cup", isPantryStaple: false },
      { name: "Rice", amount: "2 cups", isPantryStaple: true },
    ]
  },
  {
    name: "Sheet Pan Lemon Chicken", description: "Bright lemony chicken and veggies, zero cleanup", prepTimeMins: 35,
    ingredients: [
      { name: "Chicken Thighs", amount: "2 lbs", isPantryStaple: false },
      { name: "Lemon", amount: "2", isPantryStaple: false },
      { name: "Asparagus", amount: "1 bunch", isPantryStaple: false },
      { name: "Garlic", amount: "4 cloves", isPantryStaple: true },
      { name: "Olive Oil", amount: "3 tbsp", isPantryStaple: true },
    ]
  },
  {
    name: "Chicken Fried Rice", description: "Better-than-takeout fried rice in 20 minutes", prepTimeMins: 20,
    ingredients: [
      { name: "Cooked Rice", amount: "3 cups", isPantryStaple: true },
      { name: "Chicken Breast", amount: "1 lb", isPantryStaple: false },
      { name: "Eggs", amount: "3", isPantryStaple: false },
      { name: "Frozen Peas & Carrots", amount: "1 cup", isPantryStaple: false },
      { name: "Soy Sauce", amount: "3 tbsp", isPantryStaple: true },
    ]
  },
  {
    name: "BBQ Chicken Drumsticks", description: "Sticky oven-baked BBQ drumsticks", prepTimeMins: 45,
    ingredients: [
      { name: "Chicken Drumsticks", amount: "3 lbs", isPantryStaple: false },
      { name: "BBQ Sauce", amount: "1 cup", isPantryStaple: true },
    ]
  },
  {
    name: "Buffalo Chicken Wraps", description: "Spicy buffalo chicken wrapped up for dinner", prepTimeMins: 20,
    ingredients: [
      { name: "Chicken Breast", amount: "1 lb", isPantryStaple: false },
      { name: "Buffalo Sauce", amount: "½ cup", isPantryStaple: true },
      { name: "Flour Tortillas", amount: "1 pack", isPantryStaple: true },
      { name: "Romaine Lettuce", amount: "1 head", isPantryStaple: false },
      { name: "Ranch Dressing", amount: "¼ cup", isPantryStaple: true },
    ]
  },
  {
    name: "Chicken Noodle Soup", description: "Classic comforting homemade chicken soup", prepTimeMins: 35,
    ingredients: [
      { name: "Chicken Breast", amount: "1 lb", isPantryStaple: false },
      { name: "Egg Noodles", amount: "2 cups", isPantryStaple: true },
      { name: "Carrots", amount: "3", isPantryStaple: false },
      { name: "Celery", amount: "3 stalks", isPantryStaple: false },
      { name: "Chicken Broth", amount: "32 oz", isPantryStaple: true },
    ]
  },
  {
    name: "Chicken Casserole", description: "Easy creamy chicken and veggie casserole", prepTimeMins: 45,
    ingredients: [
      { name: "Chicken Breast", amount: "1.5 lbs", isPantryStaple: false },
      { name: "Cream of Mushroom Soup", amount: "2 cans", isPantryStaple: true },
      { name: "Frozen Mixed Vegetables", amount: "2 cups", isPantryStaple: false },
      { name: "Shredded Cheddar", amount: "1 cup", isPantryStaple: false },
    ]
  },

  // ── Beef & Ground Beef ───────────────────────────────────────────
  {
    name: "Tacos", description: "Family favorite ground beef tacos", prepTimeMins: 25,
    ingredients: [
      { name: "Taco Shells", amount: "12", isPantryStaple: true },
      { name: "Ground Beef", amount: "1 lb", isPantryStaple: false },
      { name: "Cheese", amount: "1 cup", isPantryStaple: false },
      { name: "Lettuce", amount: "1 head", isPantryStaple: false },
    ]
  },
  {
    name: "Beef Burgers", description: "Juicy homemade burgers on the grill or stovetop", prepTimeMins: 20,
    ingredients: [
      { name: "Ground Beef", amount: "1.5 lbs", isPantryStaple: false },
      { name: "Hamburger Buns", amount: "1 pack", isPantryStaple: true },
      { name: "Sliced Cheese", amount: "4 slices", isPantryStaple: false },
      { name: "Lettuce", amount: "1 head", isPantryStaple: false },
      { name: "Tomato", amount: "1", isPantryStaple: false },
    ]
  },
  {
    name: "Meatloaf", description: "Classic comfort meatloaf with glaze", prepTimeMins: 60,
    ingredients: [
      { name: "Ground Beef", amount: "1.5 lbs", isPantryStaple: false },
      { name: "Eggs", amount: "2", isPantryStaple: false },
      { name: "Breadcrumbs", amount: "½ cup", isPantryStaple: true },
      { name: "Ketchup", amount: "¼ cup", isPantryStaple: true },
    ]
  },
  {
    name: "Beef Stew", description: "Hearty slow-cooked beef stew", prepTimeMins: 90,
    ingredients: [
      { name: "Beef Chuck", amount: "1.5 lbs", isPantryStaple: false },
      { name: "Potatoes", amount: "3 medium", isPantryStaple: false },
      { name: "Carrots", amount: "3", isPantryStaple: false },
      { name: "Beef Broth", amount: "32 oz", isPantryStaple: true },
      { name: "Tomato Paste", amount: "2 tbsp", isPantryStaple: true },
    ]
  },
  {
    name: "Stuffed Peppers", description: "Bell peppers stuffed with beef and rice", prepTimeMins: 45,
    ingredients: [
      { name: "Bell Peppers", amount: "4 large", isPantryStaple: false },
      { name: "Ground Beef", amount: "1 lb", isPantryStaple: false },
      { name: "Rice", amount: "1 cup", isPantryStaple: true },
      { name: "Tomato Sauce", amount: "15 oz", isPantryStaple: true },
    ]
  },
  {
    name: "Sloppy Joes", description: "Messy, delicious ground beef sandwiches", prepTimeMins: 20,
    ingredients: [
      { name: "Ground Beef", amount: "1 lb", isPantryStaple: false },
      { name: "Hamburger Buns", amount: "1 pack", isPantryStaple: true },
      { name: "Sloppy Joe Sauce", amount: "15 oz can", isPantryStaple: true },
    ]
  },
  {
    name: "Korean Beef Bowls", description: "Sweet and savory ground beef over steamed rice", prepTimeMins: 20,
    ingredients: [
      { name: "Ground Beef", amount: "1 lb", isPantryStaple: false },
      { name: "Rice", amount: "2 cups", isPantryStaple: true },
      { name: "Soy Sauce", amount: "3 tbsp", isPantryStaple: true },
      { name: "Brown Sugar", amount: "2 tbsp", isPantryStaple: true },
      { name: "Green Onions", amount: "3", isPantryStaple: false },
    ]
  },
  {
    name: "Beef and Broccoli", description: "Chinese-style beef and broccoli stir fry", prepTimeMins: 25,
    ingredients: [
      { name: "Flank Steak", amount: "1 lb", isPantryStaple: false },
      { name: "Broccoli", amount: "1 head", isPantryStaple: false },
      { name: "Soy Sauce", amount: "3 tbsp", isPantryStaple: true },
      { name: "Oyster Sauce", amount: "2 tbsp", isPantryStaple: true },
      { name: "Rice", amount: "2 cups", isPantryStaple: true },
    ]
  },
  {
    name: "Chili", description: "Thick and hearty beef chili", prepTimeMins: 40,
    ingredients: [
      { name: "Ground Beef", amount: "1 lb", isPantryStaple: false },
      { name: "Kidney Beans", amount: "2 cans", isPantryStaple: true },
      { name: "Diced Tomatoes", amount: "2 cans", isPantryStaple: true },
      { name: "Chili Seasoning", amount: "1 packet", isPantryStaple: true },
    ]
  },

  // ── Pork ─────────────────────────────────────────────────────────
  {
    name: "Sheet Pan Sausage & Veggies", description: "Zero cleanup roasted dinner", prepTimeMins: 35,
    ingredients: [
      { name: "Smoked Sausage", amount: "14 oz", isPantryStaple: false },
      { name: "Bell Peppers", amount: "2", isPantryStaple: false },
      { name: "Onion", amount: "1", isPantryStaple: true },
      { name: "Olive Oil", amount: "2 tbsp", isPantryStaple: true },
    ]
  },
  {
    name: "Pork Chops with Apples", description: "Pan-seared pork chops with a sweet apple glaze", prepTimeMins: 30,
    ingredients: [
      { name: "Pork Chops", amount: "4", isPantryStaple: false },
      { name: "Apples", amount: "2", isPantryStaple: false },
      { name: "Brown Sugar", amount: "2 tbsp", isPantryStaple: true },
      { name: "Butter", amount: "2 tbsp", isPantryStaple: true },
    ]
  },
  {
    name: "Pulled Pork Sandwiches", description: "Slow cooker pulled pork on soft buns", prepTimeMins: 20,
    ingredients: [
      { name: "Pork Shoulder", amount: "2 lbs", isPantryStaple: false },
      { name: "BBQ Sauce", amount: "1 cup", isPantryStaple: true },
      { name: "Hamburger Buns", amount: "1 pack", isPantryStaple: true },
      { name: "Coleslaw Mix", amount: "1 bag", isPantryStaple: false },
    ]
  },
  {
    name: "Breakfast for Dinner", description: "Scrambled eggs, bacon, and toast — a family favorite", prepTimeMins: 20,
    ingredients: [
      { name: "Eggs", amount: "8", isPantryStaple: false },
      { name: "Bacon", amount: "1 lb", isPantryStaple: false },
      { name: "Bread", amount: "1 loaf", isPantryStaple: true },
      { name: "Butter", amount: "2 tbsp", isPantryStaple: true },
    ]
  },

  // ── Fish & Seafood ────────────────────────────────────────────────
  {
    name: "Salmon with Roasted Veggies", description: "Easy baked salmon on a sheet pan", prepTimeMins: 25,
    ingredients: [
      { name: "Salmon Fillets", amount: "1.5 lbs", isPantryStaple: false },
      { name: "Broccoli", amount: "1 head", isPantryStaple: false },
      { name: "Lemon", amount: "1", isPantryStaple: false },
      { name: "Olive Oil", amount: "3 tbsp", isPantryStaple: true },
    ]
  },
  {
    name: "Fish Tacos", description: "Light and fresh fish tacos with slaw", prepTimeMins: 25,
    ingredients: [
      { name: "White Fish Fillets", amount: "1 lb", isPantryStaple: false },
      { name: "Flour Tortillas", amount: "1 pack", isPantryStaple: true },
      { name: "Coleslaw Mix", amount: "1 bag", isPantryStaple: false },
      { name: "Lime", amount: "2", isPantryStaple: false },
    ]
  },
  {
    name: "Shrimp Stir Fry", description: "Quick shrimp and veggie stir fry over rice", prepTimeMins: 20,
    ingredients: [
      { name: "Shrimp", amount: "1 lb", isPantryStaple: false },
      { name: "Snap Peas", amount: "2 cups", isPantryStaple: false },
      { name: "Bell Pepper", amount: "1", isPantryStaple: false },
      { name: "Soy Sauce", amount: "3 tbsp", isPantryStaple: true },
      { name: "Rice", amount: "2 cups", isPantryStaple: true },
    ]
  },
  {
    name: "Tuna Noodle Casserole", description: "Classic comfort casserole kids love", prepTimeMins: 35,
    ingredients: [
      { name: "Egg Noodles", amount: "2 cups", isPantryStaple: true },
      { name: "Tuna", amount: "2 cans", isPantryStaple: true },
      { name: "Cream of Mushroom Soup", amount: "1 can", isPantryStaple: true },
      { name: "Frozen Peas", amount: "1 cup", isPantryStaple: false },
    ]
  },
  {
    name: "Baked Cod with Lemon", description: "Simple flaky cod with herbs and lemon", prepTimeMins: 25,
    ingredients: [
      { name: "Cod Fillets", amount: "1.5 lbs", isPantryStaple: false },
      { name: "Lemon", amount: "2", isPantryStaple: false },
      { name: "Butter", amount: "3 tbsp", isPantryStaple: true },
      { name: "Garlic", amount: "3 cloves", isPantryStaple: true },
    ]
  },
  {
    name: "Shrimp Scampi Pasta", description: "Garlicky shrimp scampi with linguine", prepTimeMins: 20,
    ingredients: [
      { name: "Linguine Pasta", amount: "1 lb", isPantryStaple: true },
      { name: "Shrimp", amount: "1 lb", isPantryStaple: false },
      { name: "Garlic", amount: "4 cloves", isPantryStaple: true },
      { name: "Butter", amount: "4 tbsp", isPantryStaple: true },
      { name: "Lemon", amount: "1", isPantryStaple: false },
    ]
  },

  // ── Vegetarian ───────────────────────────────────────────────────
  {
    name: "Grilled Cheese & Soup", description: "Comfort food classic", prepTimeMins: 15,
    ingredients: [
      { name: "Bread", amount: "1 loaf", isPantryStaple: true },
      { name: "Cheese", amount: "8 slices", isPantryStaple: false },
      { name: "Tomato Soup", amount: "1 can", isPantryStaple: true },
    ]
  },
  {
    name: "Vegetable Curry", description: "Warm chickpea and veggie curry with naan", prepTimeMins: 30,
    ingredients: [
      { name: "Chickpeas", amount: "2 cans", isPantryStaple: true },
      { name: "Diced Tomatoes", amount: "1 can", isPantryStaple: true },
      { name: "Coconut Milk", amount: "1 can", isPantryStaple: true },
      { name: "Curry Powder", amount: "2 tbsp", isPantryStaple: true },
      { name: "Naan Bread", amount: "1 pack", isPantryStaple: false },
    ]
  },
  {
    name: "Black Bean Tacos", description: "Meatless taco night with seasoned black beans", prepTimeMins: 15,
    ingredients: [
      { name: "Black Beans", amount: "2 cans", isPantryStaple: true },
      { name: "Taco Shells", amount: "12", isPantryStaple: true },
      { name: "Salsa", amount: "1 jar", isPantryStaple: true },
      { name: "Cheese", amount: "1 cup", isPantryStaple: false },
      { name: "Avocado", amount: "2", isPantryStaple: false },
    ]
  },
  {
    name: "Caprese Pasta", description: "Fresh mozzarella and tomato pasta", prepTimeMins: 20,
    ingredients: [
      { name: "Penne Pasta", amount: "1 lb", isPantryStaple: true },
      { name: "Cherry Tomatoes", amount: "1 pint", isPantryStaple: false },
      { name: "Fresh Mozzarella", amount: "8 oz", isPantryStaple: false },
      { name: "Basil", amount: "1 bunch", isPantryStaple: false },
      { name: "Olive Oil", amount: "3 tbsp", isPantryStaple: true },
    ]
  },
  {
    name: "Minestrone Soup", description: "Hearty Italian vegetable soup", prepTimeMins: 35,
    ingredients: [
      { name: "Diced Tomatoes", amount: "2 cans", isPantryStaple: true },
      { name: "Kidney Beans", amount: "1 can", isPantryStaple: true },
      { name: "Zucchini", amount: "1", isPantryStaple: false },
      { name: "Small Pasta", amount: "1 cup", isPantryStaple: true },
      { name: "Vegetable Broth", amount: "32 oz", isPantryStaple: true },
    ]
  },
  {
    name: "Cheese Quesadillas", description: "Crispy quesadillas with salsa and sour cream", prepTimeMins: 15,
    ingredients: [
      { name: "Flour Tortillas", amount: "1 pack", isPantryStaple: true },
      { name: "Shredded Cheese", amount: "2 cups", isPantryStaple: false },
      { name: "Salsa", amount: "1 jar", isPantryStaple: true },
      { name: "Sour Cream", amount: "½ cup", isPantryStaple: false },
    ]
  },
  {
    name: "Veggie Stir Fry", description: "Colorful vegetable stir fry over rice", prepTimeMins: 20,
    ingredients: [
      { name: "Broccoli", amount: "1 head", isPantryStaple: false },
      { name: "Bell Peppers", amount: "2", isPantryStaple: false },
      { name: "Snap Peas", amount: "1 cup", isPantryStaple: false },
      { name: "Soy Sauce", amount: "3 tbsp", isPantryStaple: true },
      { name: "Rice", amount: "2 cups", isPantryStaple: true },
    ]
  },

  // ── Soups & Stews ────────────────────────────────────────────────
  {
    name: "Tomato Basil Soup", description: "Creamy homemade tomato soup with crusty bread", prepTimeMins: 25,
    ingredients: [
      { name: "Crushed Tomatoes", amount: "28 oz can", isPantryStaple: true },
      { name: "Heavy Cream", amount: "½ cup", isPantryStaple: false },
      { name: "Basil", amount: "1 bunch", isPantryStaple: false },
      { name: "Vegetable Broth", amount: "2 cups", isPantryStaple: true },
    ]
  },
  {
    name: "Potato Soup", description: "Thick and creamy loaded potato soup", prepTimeMins: 30,
    ingredients: [
      { name: "Russet Potatoes", amount: "4 large", isPantryStaple: false },
      { name: "Bacon", amount: "½ lb", isPantryStaple: false },
      { name: "Shredded Cheddar", amount: "1 cup", isPantryStaple: false },
      { name: "Chicken Broth", amount: "32 oz", isPantryStaple: true },
      { name: "Sour Cream", amount: "½ cup", isPantryStaple: false },
    ]
  },
  {
    name: "Corn Chowder", description: "Sweet and savory corn and potato chowder", prepTimeMins: 30,
    ingredients: [
      { name: "Frozen Corn", amount: "2 cups", isPantryStaple: false },
      { name: "Potatoes", amount: "2 medium", isPantryStaple: false },
      { name: "Heavy Cream", amount: "1 cup", isPantryStaple: false },
      { name: "Chicken Broth", amount: "32 oz", isPantryStaple: true },
      { name: "Bacon", amount: "4 strips", isPantryStaple: false },
    ]
  },
  {
    name: "Lentil Soup", description: "Warming and nutritious lentil soup", prepTimeMins: 35,
    ingredients: [
      { name: "Green Lentils", amount: "1 lb bag", isPantryStaple: true },
      { name: "Carrots", amount: "3", isPantryStaple: false },
      { name: "Celery", amount: "3 stalks", isPantryStaple: false },
      { name: "Diced Tomatoes", amount: "1 can", isPantryStaple: true },
      { name: "Vegetable Broth", amount: "32 oz", isPantryStaple: true },
    ]
  },

  // ── Quick & Easy ─────────────────────────────────────────────────
  {
    name: "BLT Wraps", description: "Bacon, lettuce, and tomato in a flour wrap", prepTimeMins: 15,
    ingredients: [
      { name: "Bacon", amount: "1 lb", isPantryStaple: false },
      { name: "Flour Tortillas", amount: "1 pack", isPantryStaple: true },
      { name: "Romaine Lettuce", amount: "1 head", isPantryStaple: false },
      { name: "Tomato", amount: "2", isPantryStaple: false },
      { name: "Mayo", amount: "¼ cup", isPantryStaple: true },
    ]
  },
  {
    name: "Hot Dogs with Baked Beans", description: "Classic cookout dinner on a weeknight", prepTimeMins: 15,
    ingredients: [
      { name: "Hot Dogs", amount: "1 pack", isPantryStaple: false },
      { name: "Hot Dog Buns", amount: "1 pack", isPantryStaple: true },
      { name: "Baked Beans", amount: "2 cans", isPantryStaple: true },
    ]
  },
  {
    name: "Pancakes for Dinner", description: "Fluffy pancakes with syrup — kids love it", prepTimeMins: 20,
    ingredients: [
      { name: "Pancake Mix", amount: "1 box", isPantryStaple: true },
      { name: "Eggs", amount: "2", isPantryStaple: false },
      { name: "Milk", amount: "1 cup", isPantryStaple: false },
      { name: "Maple Syrup", amount: "1 bottle", isPantryStaple: true },
    ]
  },
  {
    name: "Rotisserie Chicken Bowls", description: "Easy bowls with store-bought rotisserie chicken", prepTimeMins: 15,
    ingredients: [
      { name: "Rotisserie Chicken", amount: "1 whole", isPantryStaple: false },
      { name: "Rice", amount: "2 cups", isPantryStaple: true },
      { name: "Frozen Corn", amount: "1 cup", isPantryStaple: false },
      { name: "Black Beans", amount: "1 can", isPantryStaple: true },
      { name: "Salsa", amount: "½ cup", isPantryStaple: true },
    ]
  },
  {
    name: "Nachos", description: "Sheet pan loaded nachos, great for busy nights", prepTimeMins: 20,
    ingredients: [
      { name: "Tortilla Chips", amount: "1 large bag", isPantryStaple: true },
      { name: "Ground Beef", amount: "1 lb", isPantryStaple: false },
      { name: "Shredded Cheese", amount: "2 cups", isPantryStaple: false },
      { name: "Jalapeños", amount: "½ cup", isPantryStaple: true },
      { name: "Sour Cream", amount: "½ cup", isPantryStaple: false },
    ]
  },
  {
    name: "Teriyaki Salmon Bowls", description: "Glazed salmon over rice with cucumber", prepTimeMins: 25,
    ingredients: [
      { name: "Salmon Fillets", amount: "1.5 lbs", isPantryStaple: false },
      { name: "Teriyaki Sauce", amount: "½ cup", isPantryStaple: true },
      { name: "Rice", amount: "2 cups", isPantryStaple: true },
      { name: "Cucumber", amount: "1", isPantryStaple: false },
    ]
  },
  {
    name: "Pork Fried Rice", description: "Quick fried rice with leftover pork", prepTimeMins: 20,
    ingredients: [
      { name: "Ground Pork", amount: "1 lb", isPantryStaple: false },
      { name: "Cooked Rice", amount: "3 cups", isPantryStaple: true },
      { name: "Eggs", amount: "2", isPantryStaple: false },
      { name: "Frozen Peas & Carrots", amount: "1 cup", isPantryStaple: false },
      { name: "Soy Sauce", amount: "3 tbsp", isPantryStaple: true },
    ]
  },
];

export async function seedDatabase() {
  const existingMeals = await storage.getMeals();
  const existingNames = new Set(existingMeals.map(m => m.name));

  for (const meal of ALL_SEED_MEALS) {
    if (!existingNames.has(meal.name)) {
      await storage.createMeal(
        { name: meal.name, description: meal.description, prepTimeMins: meal.prepTimeMins, isPreset: true },
        meal.ingredients
      );
    }
  }
}

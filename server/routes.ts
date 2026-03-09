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
  // Register auth routes
  registerAuthRoutes(app);

  app.get(api.meals.list.path, isAuthenticated, async (req: any, res) => {
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

  app.post(api.mealPlans.generate.path, isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const meals = await storage.getMeals(userId);
      const pantryItems = await storage.getPantryItems(userId);
      
      const prompt = `
      You are an AI meal planner for busy families. Create a 5-day weeknight meal plan (Monday to Friday).
      
      Available Meals (with their ingredients):
      ${JSON.stringify(meals.map(m => ({ id: m.id, name: m.name, prepTime: m.prepTimeMins, ingredients: m.ingredients.map((i: any) => ({ name: i.name, amount: i.amount, isPantryStaple: i.isPantryStaple })) })))}
      
      Instructions:
      1. Pick exactly 5 meals from the available meals list.
      2. For the grocery list, consolidate ALL ingredients across all 5 meals. Combine duplicates and sum quantities.
      3. For each grocery item, produce a "storeUnit" that describes exactly what to pick up at the store (e.g. "1 lb pack", "2 cans (14.5 oz each)", "1 bunch", "1 head", "1 bag (8 oz)"). This should reflect how the item is sold, not just a recipe measurement.
      4. Classify each ingredient as a "pantryStaple" if it is a common household pantry item (e.g. olive oil, salt, pepper, soy sauce, taco seasoning, pasta, rice, canned tomatoes, flour, sugar, garlic powder, etc.).
      5. Return a JSON object with this exact structure:
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
          {"name": "Broccoli", "storeUnit": "1 head", "isPantryStaple": false},
          {"name": "Olive Oil", "storeUnit": "1 bottle (16 oz)", "isPantryStaple": true},
          {"name": "Soy Sauce", "storeUnit": "1 bottle (10 oz)", "isPantryStaple": true}
        ]
      }
      Only return valid JSON. Do not return markdown blocks or any other text.
      `;

      const aiRes = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" }
      });
      
      const content = aiRes.choices[0].message.content;
      if (!content) throw new Error("No content from AI");
      
      const parsed = JSON.parse(content);
      const plan = await storage.createMealPlan(userId, parsed.plan);
      
      const toBuy = (parsed.groceryItems || []).map((item: any) => ({
        name: item.name,
        storeUnit: item.storeUnit,
        isPantryStaple: item.isPantryStaple ?? false,
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

  // Seed DB with some defaults
  seedDatabase().catch(console.error);

  return httpServer;
}

export async function seedDatabase() {
  const existingMeals = await storage.getMeals();
  if (existingMeals.length === 0) {
    await storage.createMeal(
      { name: "Spaghetti Bolognese", description: "Classic Italian pasta dish", prepTimeMins: 30, isPreset: true },
      [
        { name: "Spaghetti", amount: "1 lb", isPantryStaple: true },
        { name: "Ground Beef", amount: "1 lb", isPantryStaple: false },
        { name: "Tomato Sauce", amount: "24 oz", isPantryStaple: true }
      ]
    );
    await storage.createMeal(
      { name: "Chicken Stir Fry", description: "Quick and easy veggie stir fry", prepTimeMins: 20, isPreset: true },
      [
        { name: "Chicken Breast", amount: "1 lb", isPantryStaple: false },
        { name: "Broccoli", amount: "1 head", isPantryStaple: false },
        { name: "Soy Sauce", amount: "3 tbsp", isPantryStaple: true },
        { name: "Rice", amount: "2 cups", isPantryStaple: true }
      ]
    );
    await storage.createMeal(
      { name: "Tacos", description: "Family favorite ground beef tacos", prepTimeMins: 25, isPreset: true },
      [
        { name: "Taco Shells", amount: "12", isPantryStaple: true },
        { name: "Ground Beef", amount: "1 lb", isPantryStaple: false },
        { name: "Cheese", amount: "1 cup", isPantryStaple: false },
        { name: "Lettuce", amount: "1 head", isPantryStaple: false }
      ]
    );
    await storage.createMeal(
      { name: "Sheet Pan Sausage & Veggies", description: "Zero cleanup roasted dinner", prepTimeMins: 35, isPreset: true },
      [
        { name: "Smoked Sausage", amount: "14 oz", isPantryStaple: false },
        { name: "Bell Peppers", amount: "2", isPantryStaple: false },
        { name: "Onion", amount: "1", isPantryStaple: true },
        { name: "Olive Oil", amount: "2 tbsp", isPantryStaple: true }
      ]
    );
    await storage.createMeal(
      { name: "Grilled Cheese & Soup", description: "Comfort food classic", prepTimeMins: 15, isPreset: true },
      [
        { name: "Bread", amount: "1 loaf", isPantryStaple: true },
        { name: "Cheese", amount: "8 slices", isPantryStaple: false },
        { name: "Tomato Soup", amount: "1 can", isPantryStaple: true }
      ]
    );
  }
}

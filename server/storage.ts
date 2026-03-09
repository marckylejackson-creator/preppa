import { db } from "./db";
import { 
  meals, mealIngredients, pantryItems, mealPlans, mealPlanMeals, groceryLists, groceryListItems, swapEvents,
  type InsertMeal, type InsertPantryItem, type InsertMealIngredient, type MealCategory
} from "@shared/schema";
import { eq, and, desc, gte } from "drizzle-orm";

export interface IStorage {
  // Meals
  getMeals(userId?: string): Promise<any[]>;
  getMealById(id: number): Promise<any | null>;
  createMeal(meal: InsertMeal, ingredients?: InsertMealIngredient[]): Promise<any>;
  saveMealInstructions(id: number, instructions: string): Promise<void>;
  
  // Pantry
  getPantryItems(userId: string): Promise<any[]>;
  addPantryItem(item: InsertPantryItem): Promise<any>;
  deletePantryItem(id: number, userId: string): Promise<void>;
  
  // Meal Plans
  getCurrentMealPlan(userId: string): Promise<any | null>;
  createMealPlan(userId: string, planMeals: { mealId: number, dayOfWeek: string }[], weekOf?: string): Promise<any>;
  getMealPlanHistory(userId: string, limit?: number): Promise<any[]>;
  swapMealInPlan(planId: number, day: string, newMealId: number): Promise<void>;
  getSwapOptions(userId: string, excludeMealIds: number[]): Promise<any[]>;

  // Swap event tracking
  recordSwapEvent(userId: string, rejectedMealId: number, acceptedMealId: number): Promise<void>;
  getWeeklyRejectedCategories(userId: string): Promise<{ category: MealCategory; count: number }[]>;
  
  // Grocery Lists
  getCurrentGroceryList(userId: string): Promise<any | null>;
  createGroceryList(userId: string, planId: number, items: { name: string }[]): Promise<any>;
  toggleGroceryItem(id: number, isChecked: boolean): Promise<any>;
  getGroceryListByPlanId(planId: number): Promise<any | null>;
}

export class DatabaseStorage implements IStorage {
  async getMeals(userId?: string) {
    const allMeals = await db.select().from(meals);
    const result = [];
    for (const m of allMeals) {
      if (m.isPreset || (userId && m.userId === userId)) {
        const ingredients = await db.select().from(mealIngredients).where(eq(mealIngredients.mealId, m.id));
        result.push({ ...m, ingredients });
      }
    }
    return result;
  }
  
  async getMealById(id: number) {
    const [m] = await db.select().from(meals).where(eq(meals.id, id));
    if (!m) return null;
    const ingredients = await db.select().from(mealIngredients).where(eq(mealIngredients.mealId, m.id));
    return { ...m, ingredients };
  }

  async saveMealInstructions(id: number, instructions: string) {
    await db.update(meals).set({ instructions }).where(eq(meals.id, id));
  }

  async createMeal(meal: InsertMeal, ingredients: InsertMealIngredient[] = []) {
    const [newMeal] = await db.insert(meals).values(meal).returning();
    const insertedIngredients = [];
    if (ingredients.length > 0) {
      const vals = ingredients.map(i => ({ ...i, mealId: newMeal.id }));
      const res = await db.insert(mealIngredients).values(vals).returning();
      insertedIngredients.push(...res);
    }
    return { ...newMeal, ingredients: insertedIngredients };
  }
  
  async getPantryItems(userId: string) {
    return db.select().from(pantryItems).where(eq(pantryItems.userId, userId));
  }
  
  async addPantryItem(item: InsertPantryItem) {
    const [newItem] = await db.insert(pantryItems).values(item).returning();
    return newItem;
  }
  
  async deletePantryItem(id: number, userId: string) {
    await db.delete(pantryItems).where(and(eq(pantryItems.id, id), eq(pantryItems.userId, userId)));
  }

  async getCurrentMealPlan(userId: string) {
    const [plan] = await db.select().from(mealPlans).where(eq(mealPlans.userId, userId)).orderBy(desc(mealPlans.createdAt)).limit(1);
    if (!plan) return null;
    
    const planMeals = await db.select().from(mealPlanMeals).where(eq(mealPlanMeals.planId, plan.id));
    const mealsData = await Promise.all(planMeals.map(async pm => {
      const [m] = await db.select().from(meals).where(eq(meals.id, pm.mealId));
      const ingredients = await db.select().from(mealIngredients).where(eq(mealIngredients.mealId, m.id));
      return { ...pm, meal: { ...m, ingredients } };
    }));
    
    return { ...plan, meals: mealsData };
  }
  
  async createMealPlan(userId: string, planMeals: { mealId: number, dayOfWeek: string }[], weekOf?: string) {
    const [plan] = await db.insert(mealPlans).values({ userId, weekOf: weekOf ?? null }).returning();
    const vals = planMeals.map(pm => ({ ...pm, planId: plan.id }));
    await db.insert(mealPlanMeals).values(vals);
    return this.getCurrentMealPlan(userId);
  }

  async getMealPlanHistory(userId: string, limit = 8) {
    const plans = await db.select().from(mealPlans)
      .where(eq(mealPlans.userId, userId))
      .orderBy(desc(mealPlans.createdAt))
      .limit(limit);

    return Promise.all(plans.map(async plan => {
      const planMealsRows = await db.select().from(mealPlanMeals).where(eq(mealPlanMeals.planId, plan.id));
      const mealsData = await Promise.all(planMealsRows.map(async pm => {
        const [m] = await db.select().from(meals).where(eq(meals.id, pm.mealId));
        const ingredients = await db.select().from(mealIngredients).where(eq(mealIngredients.mealId, m.id));
        return { ...pm, meal: { ...m, ingredients } };
      }));
      return { ...plan, meals: mealsData };
    }));
  }
  
  async getCurrentGroceryList(userId: string) {
    const [list] = await db.select().from(groceryLists).where(eq(groceryLists.userId, userId)).orderBy(desc(groceryLists.createdAt)).limit(1);
    if (!list) return null;
    
    const items = await db.select().from(groceryListItems).where(eq(groceryListItems.listId, list.id));
    return { ...list, items };
  }
  
  async createGroceryList(userId: string, planId: number, items: { name: string, storeUnit?: string, isPantryStaple?: boolean }[]) {
    const [list] = await db.insert(groceryLists).values({ userId, planId }).returning();
    if (items.length > 0) {
      const vals = items.map(i => ({ listId: list.id, name: i.name, storeUnit: i.storeUnit ?? null, isPantryStaple: i.isPantryStaple ?? false, isChecked: false }));
      await db.insert(groceryListItems).values(vals);
    }
    return this.getCurrentGroceryList(userId);
  }
  
  async toggleGroceryItem(id: number, isChecked: boolean) {
    const [item] = await db.update(groceryListItems).set({ isChecked }).where(eq(groceryListItems.id, id)).returning();
    return item;
  }

  async swapMealInPlan(planId: number, day: string, newMealId: number) {
    const [existing] = await db.select().from(mealPlanMeals)
      .where(and(eq(mealPlanMeals.planId, planId), eq(mealPlanMeals.dayOfWeek, day)));
    if (existing) {
      await db.update(mealPlanMeals).set({ mealId: newMealId })
        .where(and(eq(mealPlanMeals.planId, planId), eq(mealPlanMeals.dayOfWeek, day)));
    }
  }

  async getSwapOptions(userId: string, excludeMealIds: number[]) {
    const allMeals = await this.getMeals(userId);
    return allMeals.filter(m => !excludeMealIds.includes(m.id));
  }

  async getGroceryListByPlanId(planId: number) {
    const [list] = await db.select().from(groceryLists).where(eq(groceryLists.planId, planId)).orderBy(desc(groceryLists.createdAt)).limit(1);
    if (!list) return null;
    const items = await db.select().from(groceryListItems).where(eq(groceryListItems.listId, list.id));
    return { ...list, items };
  }

  async recordSwapEvent(userId: string, rejectedMealId: number, acceptedMealId: number) {
    const [rejected] = await db.select().from(meals).where(eq(meals.id, rejectedMealId));
    const [accepted] = await db.select().from(meals).where(eq(meals.id, acceptedMealId));
    if (!rejected || !accepted) return;
    await db.insert(swapEvents).values({
      userId,
      rejectedMealId,
      acceptedMealId,
      rejectedCategory: (rejected.category ?? "other") as MealCategory,
      acceptedCategory: (accepted.category ?? "other") as MealCategory,
    });
  }

  async getWeeklyRejectedCategories(userId: string): Promise<{ category: MealCategory; count: number }[]> {
    // Start of current ISO week (Monday)
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0=Sun
    const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const monday = new Date(now);
    monday.setDate(now.getDate() - daysFromMonday);
    monday.setHours(0, 0, 0, 0);

    const events = await db.select()
      .from(swapEvents)
      .where(and(
        eq(swapEvents.userId, userId),
        gte(swapEvents.createdAt, monday)
      ));

    const counts: Record<string, number> = {};
    for (const e of events) {
      counts[e.rejectedCategory] = (counts[e.rejectedCategory] ?? 0) + 1;
    }

    return Object.entries(counts)
      .map(([category, count]) => ({ category: category as MealCategory, count }))
      .sort((a, b) => b.count - a.count);
  }
}

export const storage = new DatabaseStorage();

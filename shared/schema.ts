import { pgTable, serial, text, boolean, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Category values used for fuzzy preference tracking
export const MEAL_CATEGORIES = [
  "pasta", "chicken", "beef", "pork", "seafood",
  "vegetarian", "soup", "quick", "other"
] as const;
export type MealCategory = typeof MEAL_CATEGORIES[number];

// Base table for meals (both preset and user-created)
export const meals = pgTable("meals", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  prepTimeMins: integer("prep_time_mins").notNull(),
  isPreset: boolean("is_preset").default(false).notNull(),
  userId: text("user_id"), // null if preset
  category: text("category").$type<MealCategory>().default("other").notNull(),
});

export const mealIngredients = pgTable("meal_ingredients", {
  id: serial("id").primaryKey(),
  mealId: integer("meal_id").notNull(),
  name: text("name").notNull(),
  amount: text("amount"),
  isPantryStaple: boolean("is_pantry_staple").default(false).notNull(),
});

export const pantryItems = pgTable("pantry_items", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
});

export const mealPlans = pgTable("meal_plans", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  weekOf: text("week_of"), // ISO date string of the Monday the plan is for e.g. "2026-03-10"
  createdAt: timestamp("created_at").defaultNow(),
});

export const mealPlanMeals = pgTable("meal_plan_meals", {
  id: serial("id").primaryKey(),
  planId: integer("plan_id").notNull(),
  mealId: integer("meal_id").notNull(),
  dayOfWeek: text("day_of_week").notNull(), // e.g., 'Monday', 'Tuesday'
});

export const groceryLists = pgTable("grocery_lists", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  planId: integer("plan_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Tracks every swap action for preference learning
export const swapEvents = pgTable("swap_events", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  rejectedMealId: integer("rejected_meal_id").notNull(),
  acceptedMealId: integer("accepted_meal_id").notNull(),
  rejectedCategory: text("rejected_category").$type<MealCategory>().notNull(),
  acceptedCategory: text("accepted_category").$type<MealCategory>().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const groceryListItems = pgTable("grocery_list_items", {
  id: serial("id").primaryKey(),
  listId: integer("list_id").notNull(),
  name: text("name").notNull(),
  storeUnit: text("store_unit"), // e.g. "1 pack (16 oz)", "2 cans (14.5 oz each)"
  isPantryStaple: boolean("is_pantry_staple").default(false).notNull(),
  isChecked: boolean("is_checked").default(false).notNull(),
});

export const insertMealSchema = createInsertSchema(meals).omit({ id: true });
export const insertMealIngredientSchema = createInsertSchema(mealIngredients).omit({ id: true });
export const insertPantryItemSchema = createInsertSchema(pantryItems).omit({ id: true });
export const insertMealPlanSchema = createInsertSchema(mealPlans).omit({ id: true, createdAt: true });
export const insertMealPlanMealSchema = createInsertSchema(mealPlanMeals).omit({ id: true });

// Exports types
export type Meal = typeof meals.$inferSelect;
export type InsertMeal = z.infer<typeof insertMealSchema>;

export type MealIngredient = typeof mealIngredients.$inferSelect;
export type InsertMealIngredient = z.infer<typeof insertMealIngredientSchema>;

export type PantryItem = typeof pantryItems.$inferSelect;
export type InsertPantryItem = z.infer<typeof insertPantryItemSchema>;

export type MealPlan = typeof mealPlans.$inferSelect;
export type InsertMealPlan = z.infer<typeof insertMealPlanSchema>;

export type MealPlanMeal = typeof mealPlanMeals.$inferSelect;
export type InsertMealPlanMeal = z.infer<typeof insertMealPlanMealSchema>;

export type GroceryList = typeof groceryLists.$inferSelect;
export type GroceryListItem = typeof groceryListItems.$inferSelect;

export type SwapEvent = typeof swapEvents.$inferSelect;
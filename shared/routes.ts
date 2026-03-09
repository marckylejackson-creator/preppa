import { z } from "zod";
import { 
  insertMealSchema, 
  insertPantryItemSchema,
  insertMealPlanSchema,
  meals,
  pantryItems,
  mealPlans,
  mealPlanMeals,
  groceryLists,
  groceryListItems
} from "./schema";

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

// Response models that include related data
const mealWithIngredientsSchema = z.custom<typeof meals.$inferSelect & {
  ingredients: Array<typeof import('./schema').mealIngredients.$inferSelect>
}>();

const mealPlanWithDetailsSchema = z.custom<typeof mealPlans.$inferSelect & {
  meals: Array<typeof mealPlanMeals.$inferSelect & { meal: typeof meals.$inferSelect }>
}>();

const groceryListWithItemsSchema = z.custom<typeof groceryLists.$inferSelect & {
  items: Array<typeof groceryListItems.$inferSelect>
}>();

export const api = {
  meals: {
    list: {
      method: "GET" as const,
      path: "/api/meals" as const,
      responses: {
        200: z.array(mealWithIngredientsSchema),
      },
    },
    create: {
      method: "POST" as const,
      path: "/api/meals" as const,
      input: insertMealSchema.extend({
        ingredients: z.array(z.object({
          name: z.string(),
          amount: z.string().optional(),
          isPantryStaple: z.boolean().default(false)
        })).optional()
      }),
      responses: {
        201: mealWithIngredientsSchema,
        400: errorSchemas.validation,
      },
    },
  },
  pantry: {
    list: {
      method: "GET" as const,
      path: "/api/pantry" as const,
      responses: {
        200: z.array(z.custom<typeof pantryItems.$inferSelect>()),
      },
    },
    add: {
      method: "POST" as const,
      path: "/api/pantry" as const,
      input: z.object({ name: z.string() }),
      responses: {
        201: z.custom<typeof pantryItems.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    remove: {
      method: "DELETE" as const,
      path: "/api/pantry/:id" as const,
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    }
  },
  mealPlans: {
    current: {
      method: "GET" as const,
      path: "/api/meal-plans/current" as const,
      responses: {
        200: mealPlanWithDetailsSchema.nullable(),
      },
    },
    generate: {
      method: "POST" as const,
      path: "/api/meal-plans/generate" as const,
      responses: {
        200: mealPlanWithDetailsSchema,
        500: errorSchemas.internal,
      },
    }
  },
  groceryLists: {
    current: {
      method: "GET" as const,
      path: "/api/grocery-lists/current" as const,
      responses: {
        200: groceryListWithItemsSchema.nullable(),
      },
    },
    toggleItem: {
      method: "PATCH" as const,
      path: "/api/grocery-lists/items/:id/toggle" as const,
      input: z.object({ isChecked: z.boolean() }),
      responses: {
        200: z.custom<typeof groceryListItems.$inferSelect>(),
        404: errorSchemas.notFound,
      }
    }
  },
  history: {
    get: {
      method: "GET" as const,
      path: "/api/history" as const,
      responses: {
        200: z.array(z.object({
          plan: mealPlanWithDetailsSchema,
          groceryList: groceryListWithItemsSchema.nullable(),
        })),
      },
    }
  }
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}

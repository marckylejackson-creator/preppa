import { useQuery } from "@tanstack/react-query";

export type HistoryEntry = {
  plan: {
    id: number;
    userId: string;
    weekOf: string | null;
    createdAt: string;
    meals: Array<{
      id: number;
      planId: number;
      mealId: number;
      dayOfWeek: string;
      meal: {
        id: number;
        name: string;
        description: string | null;
        prepTimeMins: number;
        isPreset: boolean;
        userId: string | null;
        ingredients: Array<{
          id: number;
          mealId: number;
          name: string;
          amount: string | null;
          isPantryStaple: boolean;
        }>;
      };
    }>;
  };
  groceryList: {
    id: number;
    userId: string;
    planId: number | null;
    createdAt: string;
    items: Array<{
      id: number;
      listId: number;
      name: string;
      storeUnit: string | null;
      isPantryStaple: boolean;
      isChecked: boolean;
    }>;
  } | null;
};

export function useHistory() {
  return useQuery<HistoryEntry[]>({
    queryKey: ["/api/history"],
  });
}

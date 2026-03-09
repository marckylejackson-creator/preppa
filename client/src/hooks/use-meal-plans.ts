import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";

export function useCurrentMealPlan() {
  return useQuery({
    queryKey: [api.mealPlans.current.path],
    queryFn: async () => {
      const res = await fetch(api.mealPlans.current.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch current meal plan");
      return api.mealPlans.current.responses[200].parse(await res.json());
    },
  });
}

export function useGenerateMealPlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await fetch(api.mealPlans.generate.path, {
        method: api.mealPlans.generate.method,
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to generate meal plan");
      return api.mealPlans.generate.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.mealPlans.current.path] });
      queryClient.invalidateQueries({ queryKey: [api.groceryLists.current.path] });
    },
  });
}

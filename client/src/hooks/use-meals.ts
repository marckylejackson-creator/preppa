import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { z } from "zod";

type CreateMealInput = z.infer<typeof api.meals.create.input>;

export function useMeals() {
  return useQuery({
    queryKey: [api.meals.list.path],
    queryFn: async () => {
      const res = await fetch(api.meals.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch meals");
      return api.meals.list.responses[200].parse(await res.json());
    },
  });
}

export function useCreateMeal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateMealInput) => {
      const validated = api.meals.create.input.parse(data);
      const res = await fetch(api.meals.create.path, {
        method: api.meals.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to create meal");
      return api.meals.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.meals.list.path] });
    },
  });
}

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";

export function useCurrentGroceryList() {
  return useQuery({
    queryKey: [api.groceryLists.current.path],
    queryFn: async () => {
      const res = await fetch(api.groceryLists.current.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch current grocery list");
      return api.groceryLists.current.responses[200].parse(await res.json());
    },
  });
}

export function useToggleGroceryItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, isChecked }: { id: number; isChecked: boolean }) => {
      const url = buildUrl(api.groceryLists.toggleItem.path, { id });
      const validated = api.groceryLists.toggleItem.input.parse({ isChecked });
      const res = await fetch(url, {
        method: api.groceryLists.toggleItem.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to toggle grocery item");
      return api.groceryLists.toggleItem.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.groceryLists.current.path] });
    },
  });
}

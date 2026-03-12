import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { apiRequest } from "@/lib/queryClient";

export function usePantry() {
  return useQuery({
    queryKey: [api.pantry.list.path],
    queryFn: async () => {
      const res = await fetch(api.pantry.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch pantry");
      return api.pantry.list.responses[200].parse(await res.json());
    },
  });
}

export function useAddPantryItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { name: string }) => {
      const validated = api.pantry.add.input.parse(data);
      const res = await fetch(api.pantry.add.path, {
        method: api.pantry.add.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to add pantry item");
      return api.pantry.add.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.pantry.list.path] });
    },
  });
}

export function useRemovePantryItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.pantry.remove.path, { id });
      const res = await fetch(url, {
        method: api.pantry.remove.method,
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to remove pantry item");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.pantry.list.path] });
    },
  });
}

export function useBulkSavePantry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (names: string[]) => {
      const res = await apiRequest("POST", "/api/pantry/bulk", { names });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.pantry.list.path] });
    },
  });
}

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { X, RefreshCw, Loader2, Clock, ArrowRightLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

type Props = {
  day: string;
  currentMealName: string;
  currentPlanMealIds: number[];
  onClose: () => void;
  onSwapped?: () => void;
};

export function SwapModal({ day, currentMealName, currentPlanMealIds, onClose, onSwapped }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const excludeParam = currentPlanMealIds.join(",");

  const { data: options, isLoading: loadingOptions } = useQuery<any[]>({
    queryKey: [api.mealPlans.swapOptions.path, excludeParam],
    queryFn: async () => {
      const res = await fetch(`${api.mealPlans.swapOptions.path}?excludeIds=${excludeParam}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to load options");
      return res.json();
    },
  });

  const swapMutation = useMutation({
    mutationFn: async (newMealId: number) => {
      return apiRequest("PATCH", api.mealPlans.swap.path, { day, newMealId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.mealPlans.current.path] });
      queryClient.invalidateQueries({ queryKey: [api.groceryLists.current.path] });
      toast({ title: "Meal swapped!", description: `${day}'s dinner has been updated.` });
      onSwapped?.();
      onClose();
    },
    onError: () => {
      toast({ title: "Swap failed", description: "Couldn't swap meal. Try again.", variant: "destructive" });
    },
  });

  const handleSwap = (mealId: number) => {
    setSelectedId(mealId);
    swapMutation.mutate(mealId);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" role="dialog">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 40 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="relative bg-card rounded-3xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col border border-border/40"
      >
        {/* Header */}
        <div className="flex items-start justify-between p-6 pb-4 shrink-0">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <ArrowRightLeft size={16} className="text-primary" />
              <span className="text-xs font-bold text-primary uppercase tracking-widest">Swap Meal</span>
            </div>
            <h2 className="text-xl font-display font-bold">{day}</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Currently: <span className="font-medium text-foreground">{currentMealName}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={swapMutation.isPending}
            data-testid="button-close-swap-modal"
            className="p-2 rounded-xl hover:bg-secondary transition-colors text-muted-foreground"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-2">
          {swapMutation.isPending ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-muted-foreground">
              <Loader2 size={28} className="animate-spin text-primary" />
              <p className="text-sm font-medium">Swapping meal & updating grocery list…</p>
            </div>
          ) : loadingOptions ? (
            <div className="space-y-2 animate-pulse">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-16 bg-secondary rounded-2xl" />
              ))}
            </div>
          ) : !options || options.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <RefreshCw size={28} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">No other meals available. Add more meals first.</p>
            </div>
          ) : (
            options.map((meal: any) => (
              <button
                key={meal.id}
                onClick={() => handleSwap(meal.id)}
                disabled={swapMutation.isPending}
                data-testid={`button-swap-meal-${meal.id}`}
                className="w-full flex items-center gap-4 p-4 rounded-2xl border border-border/50 bg-background hover:border-primary/40 hover:bg-secondary/30 transition-all text-left active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground text-sm truncate">{meal.name}</p>
                  {meal.description && (
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">{meal.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                  <Clock size={12} />
                  <span>{meal.prepTimeMins}m</span>
                </div>
              </button>
            ))
          )}
        </div>
      </motion.div>
    </div>
  );
}

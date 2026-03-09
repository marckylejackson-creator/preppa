import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCurrentMealPlan, useGenerateMealPlan } from "@/hooks/use-meal-plans";
import { api } from "@shared/routes";
import { Calendar, Wand2, Loader2, ArrowRightLeft } from "lucide-react";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { RecipeModal } from "@/components/RecipeModal";

type Props = {
  isGuest?: boolean;
  onGuestAction?: () => void;
};

const DAYS_ORDER = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

export function MealPlanView({ isGuest, onGuestAction }: Props) {
  const { data: plan, isLoading } = useCurrentMealPlan();
  const generatePlan = useGenerateMealPlan();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [swappingDay, setSwappingDay] = useState<string | null>(null);
  const [selectedMeal, setSelectedMeal] = useState<any>(null);

  // Fetch all meals for random swap selection
  const { data: allMeals } = useQuery<any[]>({
    queryKey: [api.meals.list.path],
    queryFn: async () => {
      const res = await fetch(api.meals.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch meals");
      return res.json();
    },
    enabled: !isGuest,
  });

  const swapMutation = useMutation({
    mutationFn: async ({ day, newMealId }: { day: string; newMealId: number }) => {
      return apiRequest("PATCH", api.mealPlans.swap.path, { day, newMealId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.mealPlans.current.path] });
      queryClient.invalidateQueries({ queryKey: [api.groceryLists.current.path] });
      setSwappingDay(null);
    },
    onError: () => {
      toast({ title: "Swap failed", description: "Couldn't swap meal. Try again.", variant: "destructive" });
      setSwappingDay(null);
    },
  });

  const handleGenerate = () => {
    if (isGuest && onGuestAction) { onGuestAction(); return; }
    generatePlan.mutate();
  };

  const handleSwap = (day: string, currentMealId: number) => {
    if (isGuest && onGuestAction) { onGuestAction(); return; }
    if (!allMeals || swapMutation.isPending) return;

    const currentIds = plan?.meals.map((m: any) => m.mealId) ?? [];
    const options = allMeals.filter(m => !currentIds.includes(m.id));
    if (options.length === 0) {
      toast({ title: "No other meals available", description: "Add more meals to enable swapping." });
      return;
    }

    const pick = options[Math.floor(Math.random() * options.length)];
    setSwappingDay(day);
    swapMutation.mutate({ day, newMealId: pick.id });
  };

  return (
    <div className="bg-card rounded-3xl p-6 sm:p-8 premium-shadow border border-border/40 h-full flex flex-col">
      <div className="flex sm:items-center justify-between mb-8 flex-col sm:flex-row gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-accent text-accent-foreground rounded-2xl">
            <Calendar size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-display font-bold">This Week's Plan</h2>
            <p className="text-sm text-muted-foreground">Tailored for your family</p>
          </div>
        </div>

        <button
          onClick={handleGenerate}
          disabled={generatePlan.isPending}
          data-testid="button-generate-plan"
          className="px-6 py-3 bg-foreground text-background rounded-xl font-semibold hover:bg-foreground/90 active:scale-95 transition-all disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2 shadow-lg shadow-black/10"
        >
          {generatePlan.isPending ? <Loader2 size={18} className="animate-spin" /> : <Wand2 size={18} />}
          <span>{plan ? "Regenerate Plan" : "Auto-Generate"}</span>
        </button>
      </div>

      <div className="flex-1 flex flex-col">
        {isLoading ? (
          <div className="space-y-4 animate-pulse mt-4">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-16 bg-secondary rounded-2xl w-full" />
            ))}
          </div>
        ) : generatePlan.isPending ? (
          <div className="h-full min-h-[300px] flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 bg-primary/20 text-primary rounded-full flex items-center justify-center mb-6">
              <Wand2 size={32} className="animate-bounce" />
            </div>
            <h3 className="text-xl font-display font-bold mb-2">Crafting your perfect week...</h3>
            <p className="text-muted-foreground">Picking meals, checking variety.</p>
          </div>
        ) : !plan || plan.meals.length === 0 ? (
          <div className="h-full min-h-[300px] flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 bg-secondary text-muted-foreground rounded-full flex items-center justify-center mb-6">
              <Calendar size={32} />
            </div>
            <h3 className="text-xl font-display font-bold mb-2">No active plan</h3>
            <p className="text-muted-foreground max-w-[250px]">
              Tap Auto-Generate and we'll build a custom plan in under 60 seconds.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {DAYS_ORDER.map((day, idx) => {
              const dayMeal = plan.meals.find((m: any) => m.dayOfWeek === day);
              if (!dayMeal) return null;
              const isSwapping = swappingDay === day;

              return (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.07 }}
                  key={day}
                  className="flex items-center gap-3 p-3 rounded-2xl bg-secondary/30 border border-border/50 hover-elevate"
                >
                  <div className="w-24 shrink-0 font-display font-semibold text-sm text-muted-foreground">
                    {day}
                  </div>
                  <button
                    onClick={() => setSelectedMeal(dayMeal.meal)}
                    data-testid={`card-plan-meal-${day.toLowerCase()}`}
                    className={`flex-1 text-left bg-card px-4 py-2.5 rounded-xl border border-border/50 premium-shadow min-w-0 transition-opacity hover:border-primary/30 hover:bg-primary/5 ${isSwapping ? "opacity-40 pointer-events-none" : ""}`}
                  >
                    <div className="font-bold text-foreground text-sm truncate">{dayMeal.meal.name}</div>
                    <div className="text-xs font-medium text-primary mt-0.5">
                      {dayMeal.meal.prepTimeMins} mins prep
                    </div>
                  </button>
                  <button
                    onClick={() => handleSwap(day, dayMeal.mealId)}
                    disabled={isSwapping || swapMutation.isPending}
                    data-testid={`button-swap-${day.toLowerCase()}`}
                    title={`Swap ${day}'s meal`}
                    className="shrink-0 p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-card border border-transparent hover:border-border/50 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {isSwapping
                      ? <Loader2 size={16} className="animate-spin" />
                      : <ArrowRightLeft size={16} />
                    }
                  </button>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      <RecipeModal meal={selectedMeal} onClose={() => setSelectedMeal(null)} />
    </div>
  );
}

import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCurrentMealPlan, useGenerateMealPlan } from "@/hooks/use-meal-plans";
import { api } from "@shared/routes";
import { Calendar, Wand2, Loader2, ArrowRightLeft, Clock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { RecipeModal } from "@/components/RecipeModal";

type Props = {
  isGuest?: boolean;
  onGuestAction?: () => void;
};

type ReasonTray = {
  day: string;
  swapEventId: number;
};

const DAYS_ORDER = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

const SWAP_REASONS = [
  { label: "Just not in the mood", value: "not_in_mood" },
  { label: "Takes too long", value: "too_long" },
  { label: "Had it recently", value: "had_recently" },
  { label: "Kids won't eat it", value: "kids_wont_eat" },
];

const TRAY_TIMEOUT_MS = 5000;

export function MealPlanView({ isGuest, onGuestAction }: Props) {
  const { data: plan, isLoading } = useCurrentMealPlan();
  const generatePlan = useGenerateMealPlan();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [swappingDay, setSwappingDay] = useState<string | null>(null);
  const [selectedMeal, setSelectedMeal] = useState<any>(null);
  const [reasonTray, setReasonTray] = useState<ReasonTray | null>(null);
  const swapStartRef = useRef<number>(0);

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

  // Auto-dismiss reason tray after timeout
  useEffect(() => {
    if (!reasonTray) return;
    const timer = setTimeout(() => setReasonTray(null), TRAY_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [reasonTray]);

  const swapMutation = useMutation({
    mutationFn: async ({ day, newMealId }: { day: string; newMealId: number }) => {
      const res = await apiRequest("PATCH", api.mealPlans.swap.path, { day, newMealId });
      return res.json() as Promise<{ plan: any; swapEventId: number | null }>;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: [api.mealPlans.current.path] });
      queryClient.invalidateQueries({ queryKey: [api.groceryLists.current.path] });
      const elapsed = Date.now() - swapStartRef.current;
      const remaining = Math.max(0, 1000 - elapsed);
      setTimeout(() => {
        setSwappingDay(null);
        if (data.swapEventId) {
          setReasonTray({ day: variables.day, swapEventId: data.swapEventId });
        }
      }, remaining);
    },
    onError: () => {
      toast({ title: "Swap failed", description: "Couldn't swap meal. Try again.", variant: "destructive" });
      setSwappingDay(null);
    },
  });

  const handleReason = async (swapEventId: number, reason: string) => {
    setReasonTray(null);
    try {
      await apiRequest("PATCH", `/api/swap-events/${swapEventId}/reason`, { reason });
    } catch {
      // non-critical — silently ignore
    }
  };

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
    setReasonTray(null);
    swapStartRef.current = Date.now();
    setSwappingDay(day);
    swapMutation.mutate({ day, newMealId: pick.id });
  };

  return (
    <div className="bg-card rounded-3xl p-6 sm:p-8 premium-shadow border border-border/40 h-full flex flex-col">
      <div className="flex sm:items-center justify-between mb-5 flex-col sm:flex-row gap-3">
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
          <div className="space-y-1.5">
            {DAYS_ORDER.map((day, idx) => {
              const dayMeal = plan.meals.find((m: any) => m.dayOfWeek === day);
              if (!dayMeal) return null;
              const isSwapping = swappingDay === day;
              const showTray = reasonTray?.day === day;

              return (
                <div key={day}>
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.07 }}
                  >
                    {isSwapping ? (
                      <div className="bg-card px-4 py-2.5 rounded-xl border border-border/50 flex items-center gap-3 min-w-0 animate-pulse">
                        <div className="flex-1">
                          <div className="h-3.5 bg-muted-foreground/20 rounded w-3/4 mb-1.5" />
                          <div className="h-2.5 bg-muted-foreground/15 rounded w-1/4" />
                        </div>
                        <Loader2 size={15} className="animate-spin text-muted-foreground shrink-0" />
                      </div>
                    ) : (
                      <div className="bg-card px-4 py-2.5 rounded-xl border border-border/50 premium-shadow flex items-center gap-2 hover:border-primary/30 transition-colors">
                        <button
                          onClick={() => setSelectedMeal(dayMeal.meal)}
                          data-testid={`card-plan-meal-${day.toLowerCase()}`}
                          className="flex-1 text-left min-w-0"
                        >
                          <div className="font-bold text-primary text-base leading-snug">{dayMeal.meal.name}</div>
                          <div className="flex items-center gap-1 mt-0.5 text-muted-foreground">
                            <Clock size={11} />
                            <span className="text-xs font-medium">{dayMeal.meal.prepTimeMins} min</span>
                          </div>
                        </button>
                        <button
                          onClick={() => handleSwap(day, dayMeal.mealId)}
                          disabled={swapMutation.isPending}
                          data-testid={`button-swap-${day.toLowerCase()}`}
                          title="Swap meal"
                          className="shrink-0 p-1.5 rounded-lg text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <ArrowRightLeft size={15} />
                        </button>
                      </div>
                    )}
                  </motion.div>

                  {/* Reason tray — slides in below the row after a swap */}
                  <AnimatePresence>
                    {showTray && (
                      <motion.div
                        initial={{ opacity: 0, height: 0, y: -4 }}
                        animate={{ opacity: 1, height: "auto", y: 0 }}
                        exit={{ opacity: 0, height: 0, y: -4 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="flex items-center gap-2 px-3 pt-1.5 pb-0.5 flex-wrap">
                          <span className="text-xs text-muted-foreground font-medium shrink-0">Why the swap?</span>
                          {SWAP_REASONS.map(r => (
                            <button
                              key={r.value}
                              onClick={() => handleReason(reasonTray!.swapEventId, r.value)}
                              data-testid={`reason-${r.value}`}
                              className="text-xs px-2.5 py-1 rounded-lg bg-secondary hover:bg-primary/10 hover:text-primary border border-border/50 hover:border-primary/30 transition-all font-medium"
                            >
                              {r.label}
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <RecipeModal meal={selectedMeal} onClose={() => setSelectedMeal(null)} />
    </div>
  );
}

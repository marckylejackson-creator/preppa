import { useMemo } from "react";
import { Navbar } from "@/components/Navbar";
import { useHistory, type HistoryEntry } from "@/hooks/use-history";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Calendar, ShoppingCart, ChevronDown, ChevronUp, UtensilsCrossed, Clock, Heart, CalendarPlus, Loader2 } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { clsx } from "clsx";

const DAYS_ORDER = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

function formatWeekOf(weekOf: string | null, createdAt: string) {
  const date = weekOf ? new Date(weekOf + "T12:00:00") : new Date(createdAt);
  return date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function WeekCard({ entry, index, favorites }: {
  entry: HistoryEntry;
  index: number;
  favorites: string[];
}) {
  const { plan, groceryList } = entry;
  const { toast } = useToast();
  const [groceryOpen, setGroceryOpen] = useState(false);
  const [addingMeal, setAddingMeal] = useState<string | null>(null);

  const weekLabel = index === 0 ? "Current / Most Recent Plan" : `Plan #${index + 1}`;
  const weekStartLabel = formatWeekOf(plan.weekOf, plan.createdAt);
  const shopDateLabel = groceryList ? formatDate(groceryList.createdAt) : null;
  const mainItems = groceryList?.items.filter(i => !i.isPantryStaple) ?? [];
  const stapleItems = groceryList?.items.filter(i => i.isPantryStaple) ?? [];

  const isFav = (name: string) => favorites.map(f => f.toLowerCase()).includes(name.toLowerCase());

  const addFavMutation = useMutation({
    mutationFn: (updated: string[]) =>
      apiRequest("PATCH", "/api/profile/favorites", { favorites: updated }).then(r => r.json()),
    onSuccess: (_, updated) => {
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
      const added = updated.length > favorites.length;
      toast({ description: added ? "Added to favorites!" : "Removed from favorites." });
    },
    onError: () => toast({ description: "Couldn't update favorites.", variant: "destructive" }),
  });

  const addToPlanMutation = useMutation({
    mutationFn: ({ mealName, day }: { mealName: string; day: string }) =>
      apiRequest("POST", "/api/profile/add-to-plan", { mealName, day }).then(r => r.json()),
    onSuccess: (_d, vars) => {
      queryClient.invalidateQueries({ queryKey: ["/api/meal-plans/current"] });
      queryClient.invalidateQueries({ queryKey: ["/api/grocery-lists/current"] });
      setAddingMeal(null);
      toast({ description: `${vars.mealName} added to this week's menu!` });
    },
    onError: () => {
      setAddingMeal(null);
      toast({ description: "Couldn't add to menu — try again.", variant: "destructive" });
    },
  });

  const handleToggleFav = (e: React.MouseEvent, mealName: string) => {
    e.stopPropagation();
    if (isFav(mealName)) {
      addFavMutation.mutate(favorites.filter(f => f.toLowerCase() !== mealName.toLowerCase()));
    } else {
      addFavMutation.mutate([...favorites, mealName]);
    }
  };

  const handleAddToMenu = (e: React.MouseEvent, mealName: string, day: string) => {
    e.stopPropagation();
    if (addToPlanMutation.isPending) return;
    setAddingMeal(mealName);
    addToPlanMutation.mutate({ mealName, day: day.toLowerCase() });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07 }}
      className="bg-card border border-border/40 rounded-3xl overflow-hidden premium-shadow"
    >
      <div className="p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-5">
          <div>
            <span className="text-xs font-semibold text-primary uppercase tracking-widest">{weekLabel}</span>
            <h3 className="text-lg font-display font-bold mt-0.5 flex items-center gap-2">
              <Calendar size={18} className="text-muted-foreground" />
              Week of {weekStartLabel}
            </h3>
          </div>
          {shopDateLabel && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-secondary/50 px-3 py-1.5 rounded-xl">
              <ShoppingCart size={14} />
              <span>Groceries: {shopDateLabel}</span>
            </div>
          )}
        </div>

        {/* Meal tiles — no day labels */}
        <div className="grid grid-cols-1 gap-2">
          {DAYS_ORDER.map(day => {
            const dayMeal = plan.meals.find(m => m.dayOfWeek === day);
            if (!dayMeal) return (
              <div key={day} className="rounded-2xl bg-secondary/20 border border-border/20 p-3 flex items-center justify-center min-h-[80px]">
                <span className="text-xs text-muted-foreground/50 italic">—</span>
              </div>
            );
            const favd = isFav(dayMeal.meal.name);
            const isAddingThis = addingMeal === dayMeal.meal.name;
            return (
              <div
                key={day}
                className="group/tile relative rounded-2xl bg-secondary/40 border border-border/30 p-3 flex flex-col gap-2 hover:border-border/60 transition-colors"
                data-testid={`history-day-${plan.id}-${day}`}
              >
                {/* Action icons — always visible, bigger for touch */}
                <div className="flex items-center justify-end gap-1">
                  <button
                    onClick={e => handleToggleFav(e, dayMeal.meal.name)}
                    disabled={addFavMutation.isPending}
                    data-testid={`button-fav-${plan.id}-${day}`}
                    title={favd ? "Remove from favorites" : "Add to favorites"}
                    className={clsx(
                      "w-8 h-8 flex items-center justify-center rounded-xl transition-colors",
                      favd
                        ? "text-primary hover:text-primary/70"
                        : "text-muted-foreground hover:text-primary"
                    )}
                  >
                    <Heart size={16} className={favd ? "fill-primary" : ""} />
                  </button>
                  <button
                    onClick={e => handleAddToMenu(e, dayMeal.meal.name, dayMeal.dayOfWeek)}
                    disabled={addToPlanMutation.isPending}
                    data-testid={`button-add-plan-${plan.id}-${day}`}
                    title="Add to this week's menu"
                    className="w-8 h-8 flex items-center justify-center rounded-xl text-muted-foreground hover:text-primary transition-colors"
                  >
                    {isAddingThis
                      ? <Loader2 size={16} className="animate-spin" />
                      : <CalendarPlus size={16} />}
                  </button>
                </div>

                {/* Meal info */}
                <span className="text-sm font-semibold text-foreground leading-tight">{dayMeal.meal.name}</span>
                <span className="text-xs text-muted-foreground flex items-center gap-1 mt-auto">
                  <Clock size={11} /> {dayMeal.meal.prepTimeMins}m
                </span>
              </div>
            );
          })}
        </div>

        {/* Grocery toggle */}
        {groceryList && (
          <div className="mt-4">
            <button
              onClick={() => setGroceryOpen(o => !o)}
              className="flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
              data-testid={`toggle-grocery-${plan.id}`}
            >
              <ShoppingCart size={15} />
              <span>{mainItems.length} items to buy</span>
              {groceryOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>

            <AnimatePresence>
              {groceryOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {mainItems.map(item => (
                      <div
                        key={item.id}
                        className="flex items-center gap-2 bg-secondary/30 rounded-xl px-3 py-2 text-sm"
                        data-testid={`grocery-item-${item.id}`}
                      >
                        <span className={`font-medium ${item.isChecked ? "line-through text-muted-foreground" : ""}`}>
                          {item.name}
                        </span>
                        {item.storeUnit && (
                          <span className="ml-auto text-xs text-muted-foreground whitespace-nowrap">{item.storeUnit}</span>
                        )}
                      </div>
                    ))}
                  </div>
                  {stapleItems.length > 0 && (
                    <p className="text-xs text-muted-foreground mt-2">
                      + {stapleItems.length} pantry staple{stapleItems.length !== 1 ? "s" : ""} ({stapleItems.map(i => i.name).join(", ")})
                    </p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default function History() {
  const { data: history, isLoading } = useHistory();
  const { data: profile } = useQuery<any>({ queryKey: ["/api/profile"] });

  const favorites: string[] = useMemo(() => profile?.favoriteMeals ?? [], [profile]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-display font-bold text-foreground">Meal History</h1>
          <p className="text-muted-foreground mt-1">Heart any meal to save it, or tap the calendar to add it to this week's menu.</p>
        </div>

        {isLoading ? (
          <div className="space-y-4 animate-pulse">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-44 bg-secondary rounded-3xl" />
            ))}
          </div>
        ) : !history || history.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center mb-4 text-muted-foreground">
              <UtensilsCrossed size={32} />
            </div>
            <h2 className="text-xl font-display font-bold mb-2">No history yet</h2>
            <p className="text-muted-foreground max-w-xs">Generate your first meal plan on the Dashboard and it'll appear here each week.</p>
          </div>
        ) : (
          <div className="space-y-5">
            {history.map((entry, idx) => (
              <WeekCard
                key={entry.plan.id}
                entry={entry}
                index={idx}
                favorites={favorites}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

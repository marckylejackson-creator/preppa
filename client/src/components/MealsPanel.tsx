import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, Search, CalendarPlus, Trash2, X, Check, Loader2 } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday"] as const;
const DAY_LABELS: Record<string, string> = {
  monday: "Mon", tuesday: "Tue", wednesday: "Wed", thursday: "Thu", friday: "Fri",
};
const DELETE_REASONS = [
  "Already in our rotation",
  "Too time-consuming",
  "Family's not into it anymore",
  "Just tidying up",
];

export function MealsPanel() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [deletingMeal, setDeletingMeal] = useState<string | null>(null);
  const [deleteReason, setDeleteReason] = useState<string | null>(null);
  const [addingMeal, setAddingMeal] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const { data: profile, isLoading } = useQuery<any>({ queryKey: ["/api/profile"] });
  const { data: plan } = useQuery<any>({ queryKey: ["/api/meal-plans/current"] });

  const favorites: string[] = useMemo(() => profile?.favoriteMeals ?? [], [profile]);
  const filtered = useMemo(
    () => favorites.filter(f => f.toLowerCase().includes(search.toLowerCase())),
    [favorites, search]
  );

  const dayMealMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const entry of plan?.meals ?? []) map[entry.dayOfWeek] = entry.meal?.name ?? "Meal";
    return map;
  }, [plan]);

  const removeFav = useMutation({
    mutationFn: (updated: string[]) =>
      apiRequest("PATCH", "/api/profile/favorites", { favorites: updated }).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
      setDeletingMeal(null);
      setDeleteReason(null);
      toast({ description: "Removed from favorites." });
    },
    onError: () => toast({ description: "Couldn't remove — try again.", variant: "destructive" }),
  });

  const addToPlan = useMutation({
    mutationFn: ({ mealName, day }: { mealName: string; day: string }) =>
      apiRequest("POST", "/api/profile/add-to-plan", { mealName, day }).then(r => r.json()),
    onSuccess: (_d, vars) => {
      queryClient.invalidateQueries({ queryKey: ["/api/meal-plans/current"] });
      queryClient.invalidateQueries({ queryKey: ["/api/grocery-lists/current"] });
      setAddingMeal(null);
      setSelectedDay(null);
      toast({ description: `${vars.mealName} added to ${DAY_LABELS[vars.day]}!` });
    },
    onError: () => toast({ description: "Couldn't add to plan — try again.", variant: "destructive" }),
  });

  const openDelete = (meal: string) => {
    setAddingMeal(null); setSelectedDay(null);
    setDeletingMeal(prev => prev === meal ? null : meal);
    setDeleteReason(null);
  };
  const openAdd = (meal: string) => {
    setDeletingMeal(null); setDeleteReason(null);
    setAddingMeal(prev => prev === meal ? null : meal);
    setSelectedDay(null);
  };

  return (
    <div className="bg-card rounded-3xl p-6 premium-shadow border border-border/40">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <div className="p-2 bg-primary/10 text-primary rounded-xl">
          <Heart size={20} />
        </div>
        <div>
          <h2 className="text-xl font-display font-bold">Family Favorites</h2>
          <p className="text-sm text-muted-foreground">
            {favorites.length > 0 ? `${favorites.length} saved meals` : "No favorites saved yet"}
          </p>
        </div>
      </div>

      {/* Search */}
      {favorites.length > 0 && (
        <div className="relative mb-4">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <input
            data-testid="input-favorites-search"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search your favorites…"
            className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm bg-secondary/50 border border-transparent focus:border-primary/30 focus:bg-background focus:ring-4 focus:ring-primary/10 transition-all outline-none"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X size={14} />
            </button>
          )}
        </div>
      )}

      {/* List */}
      {isLoading ? (
        <div className="space-y-2 animate-pulse">
          {[1, 2, 3].map(i => <div key={i} className="h-14 bg-secondary rounded-2xl" />)}
        </div>
      ) : favorites.length === 0 ? (
        <div className="min-h-[200px] flex flex-col items-center justify-center text-center">
          <Heart size={30} className="text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">No favorites saved yet.<br />Add some in your preferences.</p>
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-10">No results for "{search}"</p>
      ) : (
        <div className="space-y-2">
          <AnimatePresence initial={false}>
            {filtered.map(meal => (
              <motion.div
                key={meal} layout
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={{ duration: 0.18 }}
              >
                <div className="rounded-2xl border border-border/50 bg-background/50 overflow-hidden">
                  {/* Row */}
                  <div className="flex items-center gap-3 px-4 py-3">
                    <p className="flex-1 font-semibold text-sm text-foreground">{meal}</p>
                    <button
                      data-testid={`button-add-to-menu-${meal}`}
                      onClick={() => openAdd(meal)}
                      title="Add to this week's menu"
                      className={`p-2 rounded-xl transition-colors ${addingMeal === meal ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-primary hover:bg-primary/10"}`}
                    >
                      <CalendarPlus size={16} />
                    </button>
                    <button
                      data-testid={`button-delete-favorite-${meal}`}
                      onClick={() => openDelete(meal)}
                      title="Remove from favorites"
                      className={`p-2 rounded-xl transition-colors ${deletingMeal === meal ? "bg-destructive/10 text-destructive" : "text-muted-foreground hover:text-destructive hover:bg-destructive/10"}`}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  {/* Add to menu tray */}
                  <AnimatePresence>
                    {addingMeal === meal && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2, ease: "easeInOut" }}
                        className="overflow-hidden"
                      >
                        <div className="px-4 pb-4 pt-1 border-t border-border/40 bg-secondary/20">
                          <p className="text-xs font-semibold text-foreground mb-2.5">Which day should we add it to?</p>
                          <div className="flex gap-1.5 flex-wrap mb-3">
                            {DAYS.map(day => {
                              const current = dayMealMap[day];
                              const isSelected = selectedDay === day;
                              return (
                                <button key={day} data-testid={`button-day-${day}`}
                                  onClick={() => setSelectedDay(day)}
                                  className={`flex flex-col items-center px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                                    isSelected
                                      ? "bg-primary text-primary-foreground border-primary shadow-md shadow-primary/20"
                                      : "bg-background border-border/60 text-foreground hover:border-primary/40 hover:bg-primary/5"
                                  }`}
                                >
                                  <span>{DAY_LABELS[day]}</span>
                                  {current && (
                                    <span className={`mt-0.5 font-normal truncate max-w-[52px] ${isSelected ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                                      {current.split(" ")[0]}
                                    </span>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => { setAddingMeal(null); setSelectedDay(null); }}
                              className="flex-1 py-2 text-xs font-semibold text-muted-foreground bg-secondary rounded-xl hover:bg-secondary/80 transition-colors">
                              Cancel
                            </button>
                            <button data-testid="button-confirm-add-to-plan"
                              disabled={!selectedDay || addToPlan.isPending}
                              onClick={() => addingMeal && selectedDay && addToPlan.mutate({ mealName: addingMeal, day: selectedDay })}
                              className="flex-1 py-2 text-xs font-bold bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-40 flex items-center justify-center gap-1.5">
                              {addToPlan.isPending ? <Loader2 size={13} className="animate-spin" /> : <><Check size={13} />Add to menu</>}
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Delete tray */}
                  <AnimatePresence>
                    {deletingMeal === meal && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2, ease: "easeInOut" }}
                        className="overflow-hidden"
                      >
                        <div className="px-4 pb-4 pt-1 border-t border-destructive/20 bg-destructive/5">
                          <p className="text-xs font-semibold text-foreground mb-2.5">Quick question — why remove this?</p>
                          <div className="flex flex-wrap gap-1.5 mb-3">
                            {DELETE_REASONS.map(reason => (
                              <button key={reason} data-testid={`chip-reason-${reason}`}
                                onClick={() => setDeleteReason(r => r === reason ? null : reason)}
                                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                                  deleteReason === reason
                                    ? "bg-destructive text-white border-destructive"
                                    : "bg-background border-border/60 text-muted-foreground hover:border-destructive/40 hover:text-foreground"
                                }`}>
                                {reason}
                              </button>
                            ))}
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => { setDeletingMeal(null); setDeleteReason(null); }}
                              className="flex-1 py-2 text-xs font-semibold text-muted-foreground bg-secondary rounded-xl hover:bg-secondary/80 transition-colors">
                              Keep it
                            </button>
                            <button data-testid={`button-confirm-delete-${meal}`}
                              disabled={removeFav.isPending}
                              onClick={() => removeFav.mutate(favorites.filter(f => f !== meal))}
                              className="flex-1 py-2 text-xs font-bold bg-destructive text-white rounded-xl hover:bg-destructive/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5">
                              {removeFav.isPending ? <Loader2 size={13} className="animate-spin" /> : <><Trash2 size={13} />Remove</>}
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

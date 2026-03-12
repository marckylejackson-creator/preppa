import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, ChefHat, Search, CalendarPlus, Trash2, X, Check, Plus, Clock, Loader2 } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useMeals, useCreateMeal } from "@/hooks/use-meals";
import { RecipeModal } from "@/components/RecipeModal";

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

type Tab = "favorites" | "my-meals";

export function MealsPanel() {
  const { toast } = useToast();
  const [tab, setTab] = useState<Tab>("favorites");

  // ── Favorites state ──────────────────────────────────────────
  const [search, setSearch] = useState("");
  const [deletingMeal, setDeletingMeal] = useState<string | null>(null);
  const [deleteReason, setDeleteReason] = useState<string | null>(null);
  const [addingMeal, setAddingMeal] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  // ── My Meals state ───────────────────────────────────────────
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedMeal, setSelectedMeal] = useState<any>(null);
  const [mealName, setMealName] = useState("");
  const [prepTime, setPrepTime] = useState("30");
  const [ingredients, setIngredients] = useState([{ name: "", isPantryStaple: false }]);

  // ── Data ─────────────────────────────────────────────────────
  const { data: profile, isLoading: profileLoading } = useQuery<any>({ queryKey: ["/api/profile"] });
  const { data: plan } = useQuery<any>({ queryKey: ["/api/meal-plans/current"] });
  const { data: meals, isLoading: mealsLoading } = useMeals();
  const createMeal = useCreateMeal();

  const favorites: string[] = useMemo(() => profile?.favoriteMeals ?? [], [profile]);
  const filteredFavorites = useMemo(
    () => favorites.filter(f => f.toLowerCase().includes(search.toLowerCase())),
    [favorites, search]
  );

  const dayMealMap = useMemo(() => {
    if (!plan?.meals) return {} as Record<string, string>;
    const map: Record<string, string> = {};
    for (const entry of plan.meals) map[entry.dayOfWeek] = entry.meal?.name ?? "Meal";
    return map;
  }, [plan]);

  // ── Favorites mutations ───────────────────────────────────────
  const removeFavMutation = useMutation({
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

  const addToPlanMutation = useMutation({
    mutationFn: ({ mealName, day }: { mealName: string; day: string }) =>
      apiRequest("POST", "/api/profile/add-to-plan", { mealName, day }).then(r => r.json()),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["/api/meal-plans/current"] });
      queryClient.invalidateQueries({ queryKey: ["/api/grocery-lists/current"] });
      setAddingMeal(null);
      setSelectedDay(null);
      toast({ description: `${vars.mealName} added to ${DAY_LABELS[vars.day]}!` });
    },
    onError: () => toast({ description: "Couldn't add to plan — try again.", variant: "destructive" }),
  });

  // ── Favorites handlers ────────────────────────────────────────
  const openDelete = (meal: string) => {
    setAddingMeal(null); setSelectedDay(null);
    setDeletingMeal(prev => prev === meal ? null : meal);
    setDeleteReason(null);
  };
  const openAddToMenu = (meal: string) => {
    setDeletingMeal(null); setDeleteReason(null);
    setAddingMeal(prev => prev === meal ? null : meal);
    setSelectedDay(null);
  };
  const confirmDelete = (meal: string) =>
    removeFavMutation.mutate(favorites.filter(f => f !== meal));
  const confirmAddToPlan = () => {
    if (addingMeal && selectedDay) addToPlanMutation.mutate({ mealName: addingMeal, day: selectedDay });
  };

  // ── My Meals handlers ─────────────────────────────────────────
  const handleAddIngredient = () =>
    setIngredients([...ingredients, { name: "", isPantryStaple: false }]);
  const handleRemoveIngredient = (i: number) =>
    setIngredients(ingredients.filter((_, idx) => idx !== i));
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMeal.mutate({
      name: mealName,
      prepTimeMins: parseInt(prepTime) || 30,
      isPreset: false,
      ingredients: ingredients.filter(i => i.name.trim()),
    }, {
      onSuccess: () => {
        setIsDialogOpen(false);
        setMealName(""); setPrepTime("30");
        setIngredients([{ name: "", isPantryStaple: false }]);
      },
    });
  };

  // ── Tabs config ───────────────────────────────────────────────
  const tabs: { id: Tab; label: string; icon: React.ReactNode; count?: number }[] = [
    { id: "favorites", label: "Family Favorites", icon: <Heart size={15} />, count: favorites.length },
    { id: "my-meals",  label: "My Meals",         icon: <ChefHat size={15} />, count: meals?.length },
  ];

  return (
    <>
      <div className="bg-card rounded-3xl p-6 premium-shadow border border-border/40">
        {/* Header row */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center bg-secondary/60 rounded-2xl p-1 gap-0.5">
            {tabs.map(t => (
              <button
                key={t.id}
                data-testid={`tab-${t.id}`}
                onClick={() => setTab(t.id)}
                className={`relative flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold transition-all ${
                  tab === t.id
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t.icon}
                <span className="hidden sm:inline">{t.label}</span>
                {t.count !== undefined && t.count > 0 && (
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                    tab === t.id ? "bg-primary/10 text-primary" : "bg-border text-muted-foreground"
                  }`}>
                    {t.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Add button — only for My Meals tab */}
          {tab === "my-meals" && (
            <button
              data-testid="button-add-meal"
              onClick={() => setIsDialogOpen(true)}
              className="p-2.5 bg-secondary text-foreground rounded-xl hover:bg-secondary/80 transition-colors"
            >
              <Plus size={20} />
            </button>
          )}
        </div>

        {/* Tab panels */}
        <AnimatePresence mode="wait" initial={false}>
          {tab === "favorites" ? (
            <motion.div
              key="favorites"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.18 }}
            >
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

              {profileLoading ? (
                <div className="space-y-2 animate-pulse">
                  {[1, 2, 3].map(i => <div key={i} className="h-14 bg-secondary rounded-2xl" />)}
                </div>
              ) : favorites.length === 0 ? (
                <div className="min-h-[200px] flex flex-col items-center justify-center text-center">
                  <Heart size={30} className="text-muted-foreground/30 mb-3" />
                  <p className="text-sm text-muted-foreground">No favorites saved yet.<br />Add some in your preferences.</p>
                </div>
              ) : filteredFavorites.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-10">No results for "{search}"</p>
              ) : (
                <div className="space-y-2">
                  <AnimatePresence initial={false}>
                    {filteredFavorites.map(meal => (
                      <motion.div
                        key={meal}
                        layout
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.97 }}
                        transition={{ duration: 0.18 }}
                      >
                        <div className="rounded-2xl border border-border/50 bg-background/50 overflow-hidden">
                          <div className="flex items-center gap-3 px-4 py-3">
                            <p className="flex-1 font-semibold text-sm text-foreground">{meal}</p>
                            <button
                              data-testid={`button-add-to-menu-${meal}`}
                              onClick={() => openAddToMenu(meal)}
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
                                      disabled={!selectedDay || addToPlanMutation.isPending}
                                      onClick={confirmAddToPlan}
                                      className="flex-1 py-2 text-xs font-bold bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-40 flex items-center justify-center gap-1.5">
                                      {addToPlanMutation.isPending ? <Loader2 size={13} className="animate-spin" /> : <><Check size={13} />Add to menu</>}
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
                                      disabled={removeFavMutation.isPending}
                                      onClick={() => confirmDelete(meal)}
                                      className="flex-1 py-2 text-xs font-bold bg-destructive text-white rounded-xl hover:bg-destructive/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5">
                                      {removeFavMutation.isPending ? <Loader2 size={13} className="animate-spin" /> : <><Trash2 size={13} />Remove</>}
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
            </motion.div>
          ) : (
            <motion.div
              key="my-meals"
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 8 }}
              transition={{ duration: 0.18 }}
            >
              {mealsLoading ? (
                <div className="space-y-3 animate-pulse">
                  {[1, 2, 3].map(i => <div key={i} className="h-20 bg-secondary rounded-2xl" />)}
                </div>
              ) : meals?.length === 0 ? (
                <div className="min-h-[200px] flex flex-col items-center justify-center text-center">
                  <ChefHat size={32} className="text-muted-foreground/30 mb-3" />
                  <p className="text-muted-foreground text-sm">No custom meals yet.<br />Hit + to add your first one.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {meals?.map(meal => (
                    <button key={meal.id} onClick={() => setSelectedMeal(meal)}
                      data-testid={`card-meal-${meal.id}`}
                      className="w-full text-left p-4 rounded-2xl border border-border/50 bg-background/50 hover:bg-secondary/30 transition-colors group cursor-pointer">
                      <div className="flex justify-between items-start mb-1.5">
                        <h3 className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors">{meal.name}</h3>
                        <span className="flex items-center gap-1 text-xs font-medium text-muted-foreground bg-secondary px-2 py-1 rounded-lg shrink-0 ml-2">
                          <Clock size={12} />{meal.prepTimeMins}m
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-1">
                        {meal.ingredients?.map((i: any) => i.name).join(", ") || "No ingredients listed"}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Add custom meal dialog */}
      <AnimatePresence>
        {isDialogOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/20 backdrop-blur-sm"
              onClick={() => setIsDialogOpen(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-md bg-card rounded-[2rem] p-6 sm:p-8 premium-shadow max-h-[90vh] overflow-y-auto"
            >
              <button onClick={() => setIsDialogOpen(false)} className="absolute top-6 right-6 text-muted-foreground hover:text-foreground">
                <X size={24} />
              </button>
              <h2 className="text-2xl font-display font-bold mb-6">Add Custom Meal</h2>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">Meal Name</label>
                  <input required value={mealName} onChange={e => setMealName(e.target.value)}
                    placeholder="e.g. Spaghetti Bolognese"
                    className="w-full px-4 py-3 rounded-xl bg-secondary/50 border-transparent focus:border-primary/30 focus:bg-white focus:ring-4 focus:ring-primary/10 transition-all outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">Prep Time (minutes)</label>
                  <input type="number" required value={prepTime} onChange={e => setPrepTime(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-secondary/50 border-transparent focus:border-primary/30 focus:bg-white focus:ring-4 focus:ring-primary/10 transition-all outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">Key Ingredients</label>
                  <div className="space-y-3">
                    {ingredients.map((ing, idx) => (
                      <div key={idx} className="flex gap-2 items-center">
                        <input value={ing.name}
                          onChange={e => { const n = [...ingredients]; n[idx].name = e.target.value; setIngredients(n); }}
                          placeholder="Ingredient name"
                          className="flex-1 px-4 py-2.5 rounded-xl bg-secondary/50 border-transparent focus:border-primary/30 focus:bg-white focus:ring-4 focus:ring-primary/10 transition-all outline-none text-sm" />
                        <button type="button" onClick={() => handleRemoveIngredient(idx)}
                          className="p-2.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive rounded-xl transition-colors">
                          <X size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                  <button type="button" onClick={handleAddIngredient}
                    className="mt-3 text-sm font-medium text-primary hover:text-primary/80 flex items-center gap-1">
                    <Plus size={16} />Add Ingredient
                  </button>
                </div>
                <div className="pt-4">
                  <button type="submit" disabled={createMeal.isPending}
                    className="w-full py-3.5 bg-primary text-primary-foreground rounded-xl font-bold hover:bg-primary/90 active:scale-[0.98] transition-all flex justify-center items-center gap-2 shadow-lg shadow-primary/25 disabled:opacity-70">
                    {createMeal.isPending ? <Loader2 size={20} className="animate-spin" /> : "Save Meal"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <RecipeModal meal={selectedMeal} onClose={() => setSelectedMeal(null)} />
    </>
  );
}

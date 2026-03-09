import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Calendar, ShoppingCart, Wand2, ArrowRightLeft, LogIn, X, ArrowRight, CheckCircle2, Circle, Package, ChevronRight, ChevronDown, Clock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const STORAGE_KEY = "preppa_guest_plan";

type GuestMeal = { day: string; meal: any };
type GuestPlan = GuestMeal[];

function SignUpPromptModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
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
        className="relative bg-card rounded-3xl shadow-2xl w-full max-w-sm p-8 border border-border/40 text-center"
      >
        <button onClick={onClose} className="absolute top-4 right-4 p-2 rounded-xl hover:bg-secondary text-muted-foreground">
          <X size={16} />
        </button>
        <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <ArrowRightLeft size={24} className="text-primary" />
        </div>
        <h2 className="text-xl font-display font-bold mb-2">Create a free account</h2>
        <p className="text-muted-foreground text-sm mb-6 leading-relaxed">
          Sign up to swap meals, regenerate your plan, save grocery lists, and track your family's history.
        </p>
        <a
          href="/api/login"
          data-testid="button-signup-from-guest"
          className="flex items-center justify-center gap-2 w-full px-6 py-3 bg-foreground text-background rounded-xl font-semibold hover:bg-foreground/90 transition-all"
        >
          <LogIn size={16} />
          Sign Up Free
          <ArrowRight size={16} />
        </a>
        <button onClick={onClose} className="mt-3 text-sm text-muted-foreground hover:text-foreground transition-colors">
          Continue browsing
        </button>
      </motion.div>
    </div>
  );
}

function buildGroceryList(plan: GuestPlan) {
  const itemMap = new Map<string, { name: string; amount: string; isPantryStaple: boolean }>();
  for (const { meal } of plan) {
    for (const ing of meal.ingredients ?? []) {
      if (!itemMap.has(ing.name.toLowerCase())) {
        itemMap.set(ing.name.toLowerCase(), { name: ing.name, amount: ing.amount ?? "", isPantryStaple: ing.isPantryStaple });
      }
    }
  }
  return Array.from(itemMap.values());
}

function generateRandomPlan(meals: any[]): GuestPlan {
  const shuffled = [...meals].sort(() => Math.random() - 0.5);
  return DAYS.map((day, i) => ({ day, meal: shuffled[i % shuffled.length] }));
}

export default function GuestDashboard() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [pantryOpen, setPantryOpen] = useState(false);

  const { data: meals, isLoading: loadingMeals } = useQuery<any[]>({
    queryKey: ["/api/meals"],
    queryFn: async () => {
      const res = await fetch("/api/meals");
      if (!res.ok) throw new Error("Failed to load meals");
      return res.json();
    },
  });

  const [plan, setPlan] = useState<GuestPlan>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  useEffect(() => {
    if (meals && meals.length > 0 && plan.length === 0) {
      const newPlan = generateRandomPlan(meals);
      setPlan(newPlan);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newPlan));
    }
  }, [meals]);

  const groceryItems = buildGroceryList(plan);
  const mainItems = groceryItems.filter(i => !i.isPantryStaple);
  const stapleItems = groceryItems.filter(i => i.isPantryStaple);

  const handleGuestAction = () => setShowPrompt(true);

  return (
    <div className="min-h-screen bg-background">
      {/* Minimal guest nav */}
      <nav className="sticky top-0 z-40 w-full bg-white/80 backdrop-blur border-b border-border/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex justify-between items-center h-16">
          <Link href="/" className="font-display font-bold text-xl tracking-tight text-foreground">Preppa</Link>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground hidden sm:block">This is a preview</span>
            <a
              href="/api/login"
              data-testid="button-guest-signin"
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl bg-foreground text-background hover:bg-foreground/90 transition-all"
            >
              <LogIn size={14} />
              Sign Up Free
            </a>
          </div>
        </div>
      </nav>

      {/* Preview banner */}
      <div className="bg-primary/5 border-b border-primary/10 px-4 py-2.5 text-center">
        <p className="text-sm text-primary font-medium">
          You're viewing a preview plan.{" "}
          <a href="/api/login" className="underline font-semibold">Sign up free</a>
          {" "}to save it, swap meals, and track your history.
        </p>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Meal Plan */}
          <div className="bg-card rounded-3xl p-6 sm:p-8 border border-border/40 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-accent text-accent-foreground rounded-2xl">
                  <Calendar size={22} />
                </div>
                <div>
                  <h2 className="text-xl font-display font-bold">Sample Week</h2>
                  <p className="text-xs text-muted-foreground">Your AI-picked dinners</p>
                </div>
              </div>
              <button
                onClick={handleGuestAction}
                data-testid="button-guest-regenerate"
                className="px-4 py-2.5 bg-foreground text-background rounded-xl text-sm font-semibold hover:bg-foreground/90 active:scale-95 transition-all flex items-center gap-2"
              >
                <Wand2 size={15} />
                Regenerate
              </button>
            </div>

            {loadingMeals ? (
              <div className="space-y-3 animate-pulse">
                {[1,2,3,4,5].map(i => <div key={i} className="h-14 bg-secondary rounded-2xl" />)}
              </div>
            ) : (
              <div className="space-y-3">
                {plan.map(({ day, meal }, idx) => (
                  <motion.div
                    key={day}
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.06 }}
                    className="flex items-center gap-3 p-3 rounded-2xl bg-secondary/30 border border-border/40"
                  >
                    <div className="w-20 shrink-0 font-display font-semibold text-sm text-muted-foreground">{day}</div>
                    <div className="flex-1 bg-card px-3 py-2 rounded-xl border border-border/50 min-w-0">
                      <div className="font-bold text-sm truncate">{meal.name}</div>
                      <div className="text-xs text-primary mt-0.5 flex items-center gap-1">
                        <Clock size={10} /> {meal.prepTimeMins}m
                      </div>
                    </div>
                    <button
                      onClick={handleGuestAction}
                      data-testid={`button-guest-swap-${day.toLowerCase()}`}
                      className="shrink-0 p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-card border border-transparent hover:border-border/50 transition-all"
                      title="Swap meal (sign up required)"
                    >
                      <ArrowRightLeft size={15} />
                    </button>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* Grocery List */}
          <div className="bg-card rounded-3xl p-6 sm:p-8 border border-border/40 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-primary/10 text-primary rounded-2xl">
                <ShoppingCart size={22} />
              </div>
              <div>
                <h2 className="text-xl font-display font-bold">Grocery List</h2>
                <p className="text-xs text-muted-foreground">{mainItems.length} items to buy</p>
              </div>
            </div>

            {loadingMeals ? (
              <div className="space-y-2 animate-pulse">
                {[1,2,3,4,5].map(i => <div key={i} className="h-10 bg-secondary rounded-lg" />)}
              </div>
            ) : (
              <div className="space-y-2">
                {mainItems.map((item, i) => (
                  <div
                    key={i}
                    onClick={handleGuestAction}
                    data-testid={`guest-grocery-item-${i}`}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-border bg-background cursor-pointer hover:border-primary/40 transition-colors group"
                  >
                    <Circle size={16} className="text-muted-foreground shrink-0" />
                    <span className="flex-1 text-sm font-medium">{item.name}</span>
                    {item.amount && (
                      <span className="text-xs text-muted-foreground">{item.amount}</span>
                    )}
                  </div>
                ))}

                {stapleItems.length > 0 && (
                  <div className="mt-2">
                    <button
                      onClick={() => setPantryOpen(o => !o)}
                      data-testid="button-guest-toggle-staples"
                      className="w-full flex items-center gap-2 px-1 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {pantryOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      <Package size={14} />
                      <span className="font-medium">Pantry Staples</span>
                      <span className="ml-auto text-xs bg-muted rounded-full px-2 py-0.5">{stapleItems.length}</span>
                    </button>
                    <AnimatePresence>
                      {pantryOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden space-y-2 mt-1"
                        >
                          {stapleItems.map((item, i) => (
                            <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-border/50 bg-muted/30">
                              <Circle size={16} className="text-muted-foreground shrink-0" />
                              <span className="flex-1 text-sm font-medium text-muted-foreground">{item.name}</span>
                            </div>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}

                {/* CTA to sign up */}
                <div className="mt-4 p-4 bg-primary/5 border border-primary/20 rounded-2xl text-center">
                  <p className="text-sm font-medium text-foreground mb-2">Want to save & share this list?</p>
                  <a
                    href="/api/login"
                    data-testid="button-guest-signup-cta"
                    className="inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold rounded-xl bg-foreground text-background hover:bg-foreground/90 transition-all"
                  >
                    Sign Up Free <ArrowRight size={14} />
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      <AnimatePresence>
        {showPrompt && <SignUpPromptModal onClose={() => setShowPrompt(false)} />}
      </AnimatePresence>
    </div>
  );
}

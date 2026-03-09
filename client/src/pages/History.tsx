import { useState } from "react";
import { Navbar } from "@/components/Navbar";
import { useHistory, type HistoryEntry } from "@/hooks/use-history";
import { Calendar, ShoppingCart, ChevronDown, ChevronUp, UtensilsCrossed, Clock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const DAYS_ORDER = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

function formatWeekOf(weekOf: string | null, createdAt: string) {
  const date = weekOf ? new Date(weekOf + "T12:00:00") : new Date(createdAt);
  return date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function WeekCard({ entry, index }: { entry: HistoryEntry; index: number }) {
  const [groceryOpen, setGroceryOpen] = useState(false);
  const { plan, groceryList } = entry;

  const weekLabel = index === 0 ? "Current / Most Recent Plan" : `Plan #${index + 1}`;
  const weekStartLabel = formatWeekOf(plan.weekOf, plan.createdAt);
  const shopDateLabel = groceryList ? formatDate(groceryList.createdAt) : null;

  const mainItems = groceryList?.items.filter(i => !i.isPantryStaple) ?? [];
  const stapleItems = groceryList?.items.filter(i => i.isPantryStaple) ?? [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07 }}
      className="bg-card border border-border/40 rounded-3xl overflow-hidden premium-shadow"
    >
      <div className="p-6">
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

        <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
          {DAYS_ORDER.map(day => {
            const dayMeal = plan.meals.find(m => m.dayOfWeek === day);
            return (
              <div
                key={day}
                className="rounded-2xl bg-secondary/40 border border-border/30 p-3 flex flex-col gap-1"
                data-testid={`history-day-${plan.id}-${day}`}
              >
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wide">{day.slice(0, 3)}</span>
                {dayMeal ? (
                  <>
                    <span className="text-sm font-semibold text-foreground leading-tight">{dayMeal.meal.name}</span>
                    <span className="text-xs text-muted-foreground flex items-center gap-1 mt-auto">
                      <Clock size={11} /> {dayMeal.meal.prepTimeMins}m
                    </span>
                  </>
                ) : (
                  <span className="text-xs text-muted-foreground italic">—</span>
                )}
              </div>
            );
          })}
        </div>

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

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-display font-bold text-foreground">Meal History</h1>
          <p className="text-muted-foreground mt-1">See what your family ate and when you shopped each week.</p>
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
              <WeekCard key={entry.plan.id} entry={entry} index={idx} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

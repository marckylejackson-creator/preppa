import { useCurrentMealPlan, useGenerateMealPlan } from "@/hooks/use-meal-plans";
import { Calendar, Wand2, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

export function MealPlanView() {
  const { data: plan, isLoading } = useCurrentMealPlan();
  const generatePlan = useGenerateMealPlan();

  const handleGenerate = () => {
    generatePlan.mutate();
  };

  const daysOrder = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

  return (
    <div className="bg-card rounded-3xl p-6 sm:p-8 premium-shadow border border-border/40 h-full flex flex-col">
      <div className="flex sm:items-center justify-between mb-8 flex-col sm:flex-row gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-accent text-accent-foreground rounded-2xl">
            <Calendar size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-display font-bold">This Week's Plan</h2>
            <p className="text-sm text-muted-foreground">Tailored to your pantry & time</p>
          </div>
        </div>

        <button
          onClick={handleGenerate}
          disabled={generatePlan.isPending}
          className="px-6 py-3 bg-foreground text-background rounded-xl font-semibold hover:bg-foreground/90 active:scale-95 transition-all disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2 shadow-lg shadow-black/10"
        >
          {generatePlan.isPending ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <Wand2 size={18} />
          )}
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
          <div className="h-full min-h-[300px] flex flex-col items-center justify-center text-center animate-pulse">
            <div className="w-16 h-16 bg-primary/20 text-primary rounded-full flex items-center justify-center mb-6">
              <Wand2 size={32} className="animate-bounce" />
            </div>
            <h3 className="text-xl font-display font-bold mb-2">Crafting your perfect week...</h3>
            <p className="text-muted-foreground">Checking pantry staples, aligning schedules.</p>
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
          <div className="space-y-4">
            {daysOrder.map((day, idx) => {
              const dayMeal = plan.meals.find(m => m.dayOfWeek === day);
              if (!dayMeal) return null;
              
              return (
                <motion.div 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  key={day} 
                  className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-2xl bg-secondary/30 border border-border/50 hover-elevate"
                >
                  <div className="sm:w-32 font-display font-semibold text-muted-foreground">
                    {day}
                  </div>
                  <div className="flex-1 bg-card px-4 py-3 rounded-xl border border-border/50 premium-shadow">
                    <div className="font-bold text-foreground">{dayMeal.meal.name}</div>
                    <div className="text-xs font-medium text-primary mt-1">
                      {dayMeal.meal.prepTimeMins} mins prep
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

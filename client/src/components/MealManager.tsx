import { useState } from "react";
import { useMeals, useCreateMeal } from "@/hooks/use-meals";
import { ChefHat, Plus, Clock, Loader2, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function MealManager() {
  const { data: meals, isLoading } = useMeals();
  const createMeal = useCreateMeal();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  // Form State
  const [name, setName] = useState("");
  const [prepTime, setPrepTime] = useState("30");
  const [ingredients, setIngredients] = useState([{ name: "", isPantryStaple: false }]);

  const handleAddIngredient = () => {
    setIngredients([...ingredients, { name: "", isPantryStaple: false }]);
  };

  const handleRemoveIngredient = (index: number) => {
    setIngredients(ingredients.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validIngredients = ingredients.filter(i => i.name.trim() !== "");
    
    createMeal.mutate({
      name,
      prepTimeMins: parseInt(prepTime) || 30,
      isPreset: false,
      ingredients: validIngredients
    }, {
      onSuccess: () => {
        setIsDialogOpen(false);
        setName("");
        setPrepTime("30");
        setIngredients([{ name: "", isPantryStaple: false }]);
      }
    });
  };

  return (
    <div className="bg-card rounded-3xl p-6 premium-shadow border border-border/40 flex flex-col h-full">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 text-primary rounded-xl">
            <ChefHat size={20} />
          </div>
          <div>
            <h2 className="text-xl font-display font-bold">Your Meals</h2>
            <p className="text-sm text-muted-foreground">Familiar rotation</p>
          </div>
        </div>
        <button
          onClick={() => setIsDialogOpen(true)}
          className="p-2.5 bg-secondary text-foreground rounded-xl hover:bg-secondary/80 transition-colors"
        >
          <Plus size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 -mr-2 space-y-3">
        {isLoading ? (
          <div className="space-y-3 animate-pulse">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 bg-secondary rounded-2xl" />
            ))}
          </div>
        ) : meals?.length === 0 ? (
          <div className="h-full min-h-[200px] flex flex-col items-center justify-center text-center">
            <ChefHat size={32} className="text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground text-sm">No meals yet.<br/>Add your family favorites.</p>
          </div>
        ) : (
          meals?.map((meal) => (
            <div key={meal.id} className="p-4 rounded-2xl border border-border/50 bg-background/50 hover:bg-secondary/30 transition-colors group">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">{meal.name}</h3>
                <span className="flex items-center gap-1 text-xs font-medium text-muted-foreground bg-secondary px-2 py-1 rounded-lg">
                  <Clock size={12} /> {meal.prepTimeMins}m
                </span>
              </div>
              <p className="text-xs text-muted-foreground line-clamp-1">
                {meal.ingredients?.map(i => i.name).join(", ") || "No specific ingredients listed"}
              </p>
            </div>
          ))
        )}
      </div>

      {/* Custom Minimal Dialog */}
      <AnimatePresence>
        {isDialogOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/20 backdrop-blur-sm"
              onClick={() => setIsDialogOpen(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-md bg-card rounded-[2rem] p-6 sm:p-8 premium-shadow max-h-[90vh] overflow-y-auto"
            >
              <button onClick={() => setIsDialogOpen(false)} className="absolute top-6 right-6 text-muted-foreground hover:text-foreground">
                <X size={24} />
              </button>
              
              <h2 className="text-2xl font-display font-bold mb-6">Add Custom Meal</h2>
              
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">Meal Name</label>
                  <input
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Spaghetti Bolognese"
                    className="w-full px-4 py-3 rounded-xl bg-secondary/50 border-transparent focus:border-primary/30 focus:bg-white focus:ring-4 focus:ring-primary/10 transition-all outline-none"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">Prep Time (minutes)</label>
                  <input
                    type="number"
                    required
                    value={prepTime}
                    onChange={(e) => setPrepTime(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-secondary/50 border-transparent focus:border-primary/30 focus:bg-white focus:ring-4 focus:ring-primary/10 transition-all outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">Key Ingredients</label>
                  <div className="space-y-3">
                    {ingredients.map((ing, idx) => (
                      <div key={idx} className="flex gap-2 items-center">
                        <input
                          value={ing.name}
                          onChange={(e) => {
                            const newIngs = [...ingredients];
                            newIngs[idx].name = e.target.value;
                            setIngredients(newIngs);
                          }}
                          placeholder="Ingredient name"
                          className="flex-1 px-4 py-2.5 rounded-xl bg-secondary/50 border-transparent focus:border-primary/30 focus:bg-white focus:ring-4 focus:ring-primary/10 transition-all outline-none text-sm"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveIngredient(idx)}
                          className="p-2.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive rounded-xl transition-colors"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={handleAddIngredient}
                    className="mt-3 text-sm font-medium text-primary hover:text-primary/80 flex items-center gap-1"
                  >
                    <Plus size={16} /> Add Ingredient
                  </button>
                </div>

                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={createMeal.isPending}
                    className="w-full py-3.5 bg-primary text-primary-foreground rounded-xl font-bold hover:bg-primary/90 active:scale-[0.98] transition-all flex justify-center items-center gap-2 shadow-lg shadow-primary/25 disabled:opacity-70"
                  >
                    {createMeal.isPending ? <Loader2 size={20} className="animate-spin" /> : "Save Meal"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

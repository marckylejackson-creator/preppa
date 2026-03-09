import { X, Clock, Copy, Share2, Check, Tag, ChefHat, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

type Ingredient = {
  name: string;
  amount?: string | null;
  isPantryStaple?: boolean;
};

type Meal = {
  id: number;
  name: string;
  description?: string | null;
  prepTimeMins: number;
  category?: string | null;
  ingredients: Ingredient[];
};

type Props = {
  meal: Meal | null;
  onClose: () => void;
};

const CATEGORY_LABELS: Record<string, string> = {
  pasta: "Pasta", chicken: "Chicken", beef: "Beef", pork: "Pork",
  seafood: "Seafood", vegetarian: "Vegetarian", soup: "Soup",
  quick: "Quick & Easy", other: "Other",
};

function buildRecipeText(meal: Meal, instructions: string): string {
  const lines: string[] = [
    `🍽 ${meal.name}`,
    meal.description ? `\n${meal.description}` : "",
    `\n⏱ Prep time: ${meal.prepTimeMins} mins`,
    "\n📋 Ingredients:",
    ...meal.ingredients.map(i => `  • ${i.amount ? `${i.amount} ` : ""}${i.name}`),
  ];
  if (instructions) {
    lines.push("\n👨‍🍳 How to cook:");
    lines.push(instructions);
  }
  lines.push("\n— Shared from Preppa");
  return lines.filter(l => l !== "").join("\n");
}

export function RecipeModal({ meal, onClose }: Props) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const { data: instructionsData, isLoading: loadingInstructions } = useQuery<{ instructions: string }>({
    queryKey: ["/api/meals", meal?.id, "instructions"],
    queryFn: async () => {
      const res = await fetch(`/api/meals/${meal!.id}/instructions`);
      if (!res.ok) throw new Error("Failed to fetch instructions");
      return res.json();
    },
    enabled: !!meal,
    staleTime: Infinity,
  });

  if (!meal) return null;

  const instructions = instructionsData?.instructions ?? "";
  const steps = instructions
    .split("\n")
    .map(s => s.trim())
    .filter(s => s.length > 0);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(buildRecipeText(meal, instructions));
      setCopied(true);
      toast({ title: "Recipe copied!", description: "Paste it anywhere to share." });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: "Copy failed", description: "Try selecting and copying manually.", variant: "destructive" });
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: meal.name, text: buildRecipeText(meal, instructions) });
      } catch {
        // user cancelled — silently ignore
      }
    } else {
      handleCopy();
    }
  };

  const main = meal.ingredients.filter(i => !i.isPantryStaple);
  const staples = meal.ingredients.filter(i => i.isPantryStaple);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/30 backdrop-blur-sm"
          onClick={onClose}
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 12 }}
          transition={{ type: "spring", stiffness: 300, damping: 28 }}
          className="relative w-full max-w-md bg-card rounded-[2rem] premium-shadow overflow-hidden max-h-[90vh] flex flex-col"
        >
          {/* Header */}
          <div className="p-6 sm:p-8 pb-0">
            <button
              onClick={onClose}
              data-testid="button-close-recipe"
              className="absolute top-5 right-5 p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            >
              <X size={20} />
            </button>

            <div className="pr-8">
              {meal.category && meal.category !== "other" && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg bg-primary/10 text-primary mb-3">
                  <Tag size={10} />
                  {CATEGORY_LABELS[meal.category] ?? meal.category}
                </span>
              )}
              <h2 className="text-2xl font-display font-bold text-foreground leading-tight">{meal.name}</h2>
              {meal.description && (
                <p className="text-sm text-muted-foreground mt-1">{meal.description}</p>
              )}
              <div className="flex items-center gap-1.5 mt-3 text-sm font-medium text-primary">
                <Clock size={14} />
                {meal.prepTimeMins} mins prep
              </div>
            </div>
          </div>

          {/* Scrollable body */}
          <div className="flex-1 overflow-y-auto px-6 sm:px-8 py-6 space-y-6">

            {/* Ingredients */}
            {main.length > 0 && (
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Ingredients</h3>
                <ul className="space-y-2">
                  {main.map((ing, i) => (
                    <li key={i} className="flex items-center gap-3 text-sm" data-testid={`ingredient-${i}`}>
                      <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                      <span className="font-medium text-foreground">{ing.name}</span>
                      {ing.amount && (
                        <span className="ml-auto text-muted-foreground font-medium shrink-0">{ing.amount}</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {staples.length > 0 && (
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Pantry Staples</h3>
                <ul className="space-y-2">
                  {staples.map((ing, i) => (
                    <li key={i} className="flex items-center gap-3 text-sm opacity-60">
                      <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground shrink-0" />
                      <span className="text-foreground">{ing.name}</span>
                      {ing.amount && (
                        <span className="ml-auto text-muted-foreground shrink-0">{ing.amount}</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Instructions */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                <ChefHat size={13} />
                How to Cook
              </h3>

              {loadingInstructions ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 size={14} className="animate-spin text-primary" />
                    <span>Generating cooking steps...</span>
                  </div>
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="animate-pulse flex gap-3">
                      <div className="w-5 h-5 rounded-full bg-secondary shrink-0 mt-0.5" />
                      <div className="flex-1 space-y-1.5">
                        <div className={`h-3 bg-secondary rounded-full ${i % 2 === 0 ? "w-full" : "w-4/5"}`} />
                        {i < 3 && <div className="h-3 bg-secondary rounded-full w-3/5" />}
                      </div>
                    </div>
                  ))}
                </div>
              ) : steps.length > 0 ? (
                <ol className="space-y-4">
                  {steps.map((step, i) => {
                    const cleaned = step.replace(/^\d+[\.\)]\s*/, "");
                    return (
                      <li key={i} className="flex gap-3 text-sm" data-testid={`step-${i}`}>
                        <span className="w-6 h-6 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                          {i + 1}
                        </span>
                        <span className="text-foreground leading-relaxed">{cleaned}</span>
                      </li>
                    );
                  })}
                </ol>
              ) : (
                <p className="text-sm text-muted-foreground">Could not generate instructions. Try again later.</p>
              )}
            </div>
          </div>

          {/* Footer actions */}
          <div className="px-6 sm:px-8 pb-6 sm:pb-8 pt-2 flex gap-3 border-t border-border/50">
            <button
              onClick={handleCopy}
              data-testid="button-copy-recipe"
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-secondary text-foreground font-semibold hover:bg-secondary/80 active:scale-95 transition-all text-sm"
            >
              {copied ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
              {copied ? "Copied!" : "Copy Recipe"}
            </button>
            <button
              onClick={handleShare}
              data-testid="button-share-recipe"
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-foreground text-background font-semibold hover:bg-foreground/90 active:scale-95 transition-all text-sm"
            >
              <Share2 size={16} />
              Share
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

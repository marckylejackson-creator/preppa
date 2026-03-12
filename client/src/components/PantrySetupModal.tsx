import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Package, Check, Loader2 } from "lucide-react";
import { useBulkSavePantry } from "@/hooks/use-pantry";
import { useToast } from "@/hooks/use-toast";

const PANTRY_GROUPS = [
  {
    label: "Oils & Fats",
    items: ["Olive Oil", "Vegetable Oil", "Butter", "Cooking Spray"],
  },
  {
    label: "Spices & Seasonings",
    items: ["Salt", "Black Pepper", "Garlic Powder", "Onion Powder", "Paprika", "Cumin", "Red Pepper Flakes", "Italian Seasoning"],
  },
  {
    label: "Vinegars",
    items: ["White Vinegar", "Apple Cider Vinegar"],
  },
  {
    label: "Sauces & Condiments",
    items: ["Soy Sauce", "Worcestershire Sauce", "Hot Sauce", "Honey"],
  },
  {
    label: "Pantry Basics",
    items: ["Garlic", "Onion", "Chicken Broth", "Beef Broth"],
  },
];

const DEFAULT_CHECKED = new Set([
  "Olive Oil", "Vegetable Oil", "Butter",
  "Salt", "Black Pepper", "Garlic Powder", "Onion Powder", "Paprika", "Cumin", "Red Pepper Flakes", "Italian Seasoning",
  "White Vinegar", "Apple Cider Vinegar",
  "Soy Sauce", "Honey",
  "Garlic", "Onion",
]);

type Props = {
  onClose: () => void;
};

export function PantrySetupModal({ onClose }: Props) {
  const [checked, setChecked] = useState<Set<string>>(new Set(DEFAULT_CHECKED));
  const bulkSave = useBulkSavePantry();
  const { toast } = useToast();

  const toggle = (item: string) => {
    setChecked(prev => {
      const next = new Set(prev);
      next.has(item) ? next.delete(item) : next.add(item);
      return next;
    });
  };

  const handleSave = async () => {
    await bulkSave.mutateAsync(Array.from(checked));
    toast({ title: "Pantry saved!", description: "We'll hide these from your grocery list going forward." });
    onClose();
  };

  const handleSkip = () => {
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          onClick={handleSkip}
        />
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 40 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="relative bg-card rounded-3xl shadow-2xl w-full max-w-lg border border-border/40 overflow-hidden"
        >
          {/* Header */}
          <div className="px-6 pt-6 pb-4 border-b border-border/30">
            <button
              onClick={handleSkip}
              className="absolute top-4 right-4 p-2 rounded-xl hover:bg-secondary text-muted-foreground"
              data-testid="button-pantry-setup-close"
            >
              <X size={16} />
            </button>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-primary/10 text-primary rounded-2xl flex items-center justify-center">
                <Package size={20} />
              </div>
              <div>
                <h2 className="text-lg font-bold">What's in your pantry?</h2>
                <p className="text-xs text-muted-foreground">We'll skip these from your grocery list automatically</p>
              </div>
            </div>
          </div>

          {/* Scrollable item list */}
          <div className="px-6 py-4 max-h-[55vh] overflow-y-auto space-y-5">
            {PANTRY_GROUPS.map(group => (
              <div key={group.label}>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  {group.label}
                </p>
                <div className="flex flex-wrap gap-2">
                  {group.items.map(item => {
                    const on = checked.has(item);
                    return (
                      <button
                        key={item}
                        onClick={() => toggle(item)}
                        data-testid={`pantry-item-${item.toLowerCase().replace(/\s+/g, "-")}`}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-sm font-medium transition-all ${
                          on
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-background border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                        }`}
                      >
                        {on && <Check size={12} strokeWidth={3} />}
                        {item}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-border/30 flex items-center gap-3">
            <button
              onClick={handleSave}
              disabled={bulkSave.isPending}
              data-testid="button-pantry-setup-save"
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-foreground text-background rounded-xl font-semibold hover:bg-foreground/90 transition-all disabled:opacity-50"
            >
              {bulkSave.isPending ? <Loader2 size={16} className="animate-spin" /> : null}
              Save my pantry ({checked.size} items)
            </button>
            <button
              onClick={handleSkip}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors px-3 py-3"
              data-testid="button-pantry-setup-skip"
            >
              Skip
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

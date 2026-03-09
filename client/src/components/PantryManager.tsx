import { useState } from "react";
import { usePantry, useAddPantryItem, useRemovePantryItem } from "@/hooks/use-pantry";
import { Plus, X, Package } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function PantryManager() {
  const { data: pantryItems, isLoading } = usePantry();
  const addItem = useAddPantryItem();
  const removeItem = useRemovePantryItem();
  const [newItemName, setNewItemName] = useState("");

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim() || addItem.isPending) return;
    addItem.mutate({ name: newItemName.trim() }, {
      onSuccess: () => setNewItemName("")
    });
  };

  return (
    <div className="bg-card rounded-3xl p-6 premium-shadow border border-border/40">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-accent text-accent-foreground rounded-xl">
          <Package size={20} />
        </div>
        <div>
          <h2 className="text-xl font-display font-bold">Virtual Pantry</h2>
          <p className="text-sm text-muted-foreground">Items here won't be added to groceries.</p>
        </div>
      </div>

      <form onSubmit={handleAdd} className="flex gap-2 mb-6">
        <input
          type="text"
          value={newItemName}
          onChange={(e) => setNewItemName(e.target.value)}
          placeholder="E.g. Olive Oil, Rice..."
          className="flex-1 px-4 py-3 rounded-xl bg-secondary/50 border-transparent focus:border-primary/30 focus:bg-white focus:ring-4 focus:ring-primary/10 transition-all outline-none"
        />
        <button
          type="submit"
          disabled={!newItemName.trim() || addItem.isPending}
          className="px-5 py-3 bg-foreground text-background rounded-xl font-semibold hover:bg-foreground/90 active:scale-95 transition-all disabled:opacity-50 disabled:active:scale-100 flex items-center gap-2"
        >
          <Plus size={18} />
          <span className="hidden sm:inline">Add</span>
        </button>
      </form>

      <div className="min-h-[120px]">
        {isLoading ? (
          <div className="flex gap-2 flex-wrap animate-pulse">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-10 w-24 bg-secondary rounded-xl" />
            ))}
          </div>
        ) : pantryItems?.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center py-6">
            <p className="text-muted-foreground text-sm">Your pantry is empty.</p>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            <AnimatePresence>
              {pantryItems?.map((item) => (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  key={item.id}
                  className="group flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-xl text-sm font-medium hover:bg-secondary/80 transition-colors border border-border/50"
                >
                  {item.name}
                  <button
                    onClick={() => removeItem.mutate(item.id)}
                    className="text-muted-foreground hover:text-destructive transition-colors ml-1"
                  >
                    <X size={14} />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}

import { useCurrentGroceryList, useToggleGroceryItem } from "@/hooks/use-grocery-lists";
import { ShoppingCart, CheckCircle2, Circle } from "lucide-react";
import { clsx } from "clsx";

export function GroceryListView() {
  const { data: list, isLoading } = useCurrentGroceryList();
  const toggleItem = useToggleGroceryItem();

  const handleToggle = (id: number, currentStatus: boolean) => {
    toggleItem.mutate({ id, isChecked: !currentStatus });
  };

  return (
    <div className="bg-card rounded-3xl p-6 sm:p-8 premium-shadow border border-border/40 h-full flex flex-col">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2.5 bg-primary/10 text-primary rounded-xl">
          <ShoppingCart size={22} />
        </div>
        <div>
          <h2 className="text-xl font-display font-bold">Grocery List</h2>
          <p className="text-sm text-muted-foreground">Pantry items excluded</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 -mr-2">
        {isLoading ? (
          <div className="space-y-3 animate-pulse">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-12 bg-secondary rounded-xl" />
            ))}
          </div>
        ) : !list || list.items.length === 0 ? (
          <div className="h-full min-h-[200px] flex flex-col items-center justify-center text-center">
            <ShoppingCart size={32} className="text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground text-sm">List is empty.<br/>Generate a plan to populate.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {list.items.map((item) => (
              <button
                key={item.id}
                onClick={() => handleToggle(item.id, item.isChecked)}
                className={clsx(
                  "w-full flex items-center justify-between p-3 rounded-xl border transition-all text-left group",
                  item.isChecked 
                    ? "bg-secondary/50 border-transparent text-muted-foreground" 
                    : "bg-background border-border/50 text-foreground hover:border-primary/30 hover:shadow-sm"
                )}
              >
                <span className={clsx(
                  "font-medium transition-all",
                  item.isChecked && "line-through"
                )}>
                  {item.name}
                </span>
                <div className={clsx(
                  "transition-colors",
                  item.isChecked ? "text-primary" : "text-muted-foreground group-hover:text-primary/50"
                )}>
                  {item.isChecked ? <CheckCircle2 size={20} /> : <Circle size={20} />}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

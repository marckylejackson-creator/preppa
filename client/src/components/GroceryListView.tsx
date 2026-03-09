import { useState } from "react";
import { useCurrentGroceryList, useToggleGroceryItem } from "@/hooks/use-grocery-lists";
import { ShoppingCart, CheckCircle2, Circle, Copy, Check, ChevronDown, ChevronRight, Package } from "lucide-react";
import { clsx } from "clsx";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export function GroceryListView() {
  const { data: list, isLoading } = useCurrentGroceryList();
  const toggleItem = useToggleGroceryItem();
  const { toast } = useToast();
  const [pantryOpen, setPantryOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleToggle = (id: number, currentStatus: boolean) => {
    toggleItem.mutate({ id, isChecked: !currentStatus });
  };

  const mainItems = list?.items.filter((i) => !i.isPantryStaple) ?? [];
  const pantryItems = list?.items.filter((i) => i.isPantryStaple) ?? [];

  const buildCopyText = () => {
    const lines: string[] = [];
    lines.push("🛒 Grocery List");
    lines.push("──────────────");
    mainItems.forEach((item) => {
      const check = item.isChecked ? "✓" : "○";
      const unit = item.storeUnit ? ` — ${item.storeUnit}` : "";
      lines.push(`${check} ${item.name}${unit}`);
    });
    if (pantryItems.length > 0) {
      lines.push("");
      lines.push("Pantry / Staples");
      lines.push("──────────────");
      pantryItems.forEach((item) => {
        const check = item.isChecked ? "✓" : "○";
        const unit = item.storeUnit ? ` — ${item.storeUnit}` : "";
        lines.push(`${check} ${item.name}${unit}`);
      });
    }
    return lines.join("\n");
  };

  const handleCopy = async () => {
    const text = buildCopyText();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast({ title: "Copied!", description: "Grocery list copied to clipboard." });
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast({ title: "Could not copy", description: "Please copy manually.", variant: "destructive" });
    }
  };

  const hasItems = (mainItems.length + pantryItems.length) > 0;

  return (
    <div className="bg-card rounded-2xl p-6 border border-card-border h-full flex flex-col">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 text-primary rounded-lg">
            <ShoppingCart size={20} />
          </div>
          <div>
            <h2 className="text-lg font-semibold leading-tight">Grocery List</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {hasItems ? `${mainItems.length} item${mainItems.length !== 1 ? "s" : ""} to buy` : "Generate a plan to populate"}
            </p>
          </div>
        </div>

        {hasItems && (
          <Button
            size="sm"
            variant="outline"
            onClick={handleCopy}
            data-testid="button-copy-grocery-list"
            className="gap-1.5 shrink-0"
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? "Copied" : "Copy"}
          </Button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto space-y-2 pr-1 -mr-1">
        {isLoading ? (
          <div className="space-y-2 animate-pulse">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-11 bg-muted rounded-lg" />
            ))}
          </div>
        ) : !hasItems ? (
          <div className="h-full min-h-[200px] flex flex-col items-center justify-center text-center text-muted-foreground">
            <ShoppingCart size={28} className="opacity-20 mb-2" />
            <p className="text-sm">Generate a meal plan to<br />auto-build your list.</p>
          </div>
        ) : (
          <>
            {/* Main shopping items */}
            {mainItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleToggle(item.id, item.isChecked)}
                data-testid={`button-toggle-item-${item.id}`}
                className={clsx(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border text-left transition-colors",
                  item.isChecked
                    ? "bg-muted/40 border-transparent text-muted-foreground"
                    : "bg-background border-border text-foreground hover:border-primary/40"
                )}
              >
                <div className={clsx("shrink-0 transition-colors", item.isChecked ? "text-primary" : "text-muted-foreground")}>
                  {item.isChecked ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                </div>
                <span className={clsx("flex-1 font-medium text-sm", item.isChecked && "line-through")}>
                  {item.name}
                </span>
                {item.storeUnit && (
                  <span className={clsx("text-xs shrink-0", item.isChecked ? "text-muted-foreground/50" : "text-muted-foreground")}>
                    {item.storeUnit}
                  </span>
                )}
              </button>
            ))}

            {/* Pantry staples collapsible section */}
            {pantryItems.length > 0 && (
              <div className="mt-3">
                <button
                  onClick={() => setPantryOpen((o) => !o)}
                  data-testid="button-toggle-pantry-staples"
                  className="w-full flex items-center gap-2 px-1 py-2 text-left text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  {pantryOpen ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                  <Package size={14} />
                  <span className="font-medium">Pantry Staples</span>
                  <span className="ml-auto text-xs bg-muted rounded-full px-2 py-0.5">{pantryItems.length}</span>
                </button>

                {pantryOpen && (
                  <div className="space-y-2 mt-1 pl-1">
                    {pantryItems.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => handleToggle(item.id, item.isChecked)}
                        data-testid={`button-toggle-pantry-item-${item.id}`}
                        className={clsx(
                          "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border text-left transition-colors",
                          item.isChecked
                            ? "bg-muted/40 border-transparent text-muted-foreground"
                            : "bg-background border-border text-foreground hover:border-primary/40"
                        )}
                      >
                        <div className={clsx("shrink-0 transition-colors", item.isChecked ? "text-primary" : "text-muted-foreground")}>
                          {item.isChecked ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                        </div>
                        <span className={clsx("flex-1 font-medium text-sm", item.isChecked && "line-through")}>
                          {item.name}
                        </span>
                        {item.storeUnit && (
                          <span className={clsx("text-xs shrink-0", item.isChecked ? "text-muted-foreground/50" : "text-muted-foreground")}>
                            {item.storeUnit}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

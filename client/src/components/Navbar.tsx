import { useAuth } from "@/hooks/use-auth";
import { LogOut, UtensilsCrossed } from "lucide-react";

export function Navbar() {
  const { user, logout } = useAuth();

  return (
    <nav className="sticky top-0 z-50 w-full glass-panel border-b-0 border-x-0 border-t-0 bg-white/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
              <UtensilsCrossed size={22} strokeWidth={2.5} />
            </div>
            <span className="font-display font-bold text-2xl tracking-tight text-foreground">
              Preppa
            </span>
          </div>

          {user && (
            <div className="flex items-center gap-6">
              <div className="hidden sm:block text-sm text-muted-foreground font-medium">
                {user.email || user.firstName || "Planner"}
              </div>
              <button
                onClick={() => logout()}
                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl text-foreground hover:bg-secondary transition-colors"
              >
                <LogOut size={16} />
                <span>Log out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}

import { useAuth } from "@/hooks/use-auth";
import { LogOut, UtensilsCrossed, LayoutDashboard, History, BookOpen } from "lucide-react";
import { Link, useLocation } from "wouter";

export function Navbar() {
  const { user, logout } = useAuth();
  const [location] = useLocation();

  const navLinks = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/meals", label: "Meals", icon: BookOpen },
    { href: "/history", label: "History", icon: History },
  ];

  return (
    <nav className="sticky top-0 z-50 w-full glass-panel border-b-0 border-x-0 border-t-0 bg-white/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
                <UtensilsCrossed size={22} strokeWidth={2.5} />
              </div>
              <span className="font-display font-bold text-2xl tracking-tight text-foreground">
                Preppa
              </span>
            </Link>

            {user && (
              <div className="hidden sm:flex items-center gap-1 ml-2">
                {navLinks.map(({ href, label, icon: Icon }) => (
                  <Link
                    key={href}
                    href={href}
                    data-testid={`nav-${label.toLowerCase()}`}
                    className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl transition-colors ${
                      location === href
                        ? "bg-secondary text-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                    }`}
                  >
                    <Icon size={16} />
                    {label}
                  </Link>
                ))}
              </div>
            )}
          </div>

          {user && (
            <div className="flex items-center gap-4">
              <div className="hidden sm:block text-sm text-muted-foreground font-medium">
                {user.email || user.firstName || "Planner"}
              </div>
              <button
                onClick={() => logout()}
                data-testid="button-logout"
                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl text-foreground hover:bg-secondary transition-colors"
              >
                <LogOut size={16} />
                <span className="hidden sm:inline">Log out</span>
              </button>
            </div>
          )}
        </div>

        {user && (
          <div className="flex sm:hidden gap-1 pb-3">
            {navLinks.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                data-testid={`nav-mobile-${label.toLowerCase()}`}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl transition-colors ${
                  location === href
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon size={16} />
                {label}
              </Link>
            ))}
          </div>
        )}
      </div>
    </nav>
  );
}

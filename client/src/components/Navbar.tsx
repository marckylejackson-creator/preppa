import { useAuth } from "@/hooks/use-auth";
import { LogOut, LayoutDashboard, History, BookOpen, Settings } from "lucide-react";
import { Link, useLocation } from "wouter";
import logoSrc from "@assets/preppa_logo_orange_1_1773037358063.png";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function getInitials(user: { firstName?: string | null; lastName?: string | null; email?: string | null }): string {
  if (user.firstName && user.lastName) {
    return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
  }
  if (user.firstName) return user.firstName[0].toUpperCase();
  if (user.email) return user.email[0].toUpperCase();
  return "P";
}

function getDisplayName(user: { firstName?: string | null; lastName?: string | null; email?: string | null }): string {
  if (user.firstName && user.lastName) return `${user.firstName} ${user.lastName}`;
  if (user.firstName) return user.firstName;
  if (user.email) return user.email;
  return "Planner";
}

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
          {/* Logo + nav links */}
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center">
              <img src={logoSrc} alt="Preppa" className="h-12 w-auto" />
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

          {/* User menu */}
          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  data-testid="button-user-menu"
                  className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl hover:bg-secondary transition-colors group"
                >
                  {/* Avatar */}
                  <div className="w-8 h-8 rounded-full bg-primary/15 text-primary flex items-center justify-center text-sm font-bold shrink-0 group-hover:bg-primary/20 transition-colors">
                    {getInitials(user)}
                  </div>
                  {/* Name (hidden on small) */}
                  <span className="hidden sm:block text-sm font-semibold text-foreground max-w-[120px] truncate">
                    {getDisplayName(user)}
                  </span>
                  {/* Chevron */}
                  <svg className="hidden sm:block w-3.5 h-3.5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-semibold">{getDisplayName(user)}</span>
                    {user.email && (
                      <span className="text-xs text-muted-foreground truncate">{user.email}</span>
                    )}
                  </div>
                </DropdownMenuLabel>

                <DropdownMenuSeparator />

                <DropdownMenuItem asChild>
                  <Link
                    href="/preferences"
                    data-testid="menu-item-preferences"
                    className="flex items-center gap-2.5 cursor-pointer"
                  >
                    <Settings size={15} className="text-muted-foreground" />
                    Edit Preferences
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <DropdownMenuItem
                  onClick={() => logout()}
                  data-testid="menu-item-logout"
                  className="flex items-center gap-2.5 text-destructive focus:text-destructive cursor-pointer"
                >
                  <LogOut size={15} />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Mobile nav row */}
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

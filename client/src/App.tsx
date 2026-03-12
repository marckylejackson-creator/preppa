import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import NotFound from "@/pages/not-found";

import Landing from "@/pages/Landing";
import Dashboard from "@/pages/Dashboard";
import History from "@/pages/History";
import Meals from "@/pages/Meals";
import GuestDashboard from "@/pages/GuestDashboard";
import Onboarding from "@/pages/Onboarding";
import Preferences from "@/pages/Preferences";

function AppContent() {
  const { user, isLoading } = useAuth();
  const [location] = useLocation();

  const { data: profile, isLoading: profileLoading } = useQuery<any | null>({
    queryKey: ["/api/profile"],
    enabled: !!user,
  });

  if (isLoading || (user && profileLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  // /try is always accessible — no auth required
  if (location === "/try") {
    return <GuestDashboard />;
  }

  if (!user) {
    return <Landing />;
  }

  // New user — no profile yet → onboarding
  if (profile === null && location !== "/onboarding") {
    return <Onboarding />;
  }

  return (
    <Switch>
      <Route path="/onboarding" component={Onboarding} />
      <Route path="/preferences" component={Preferences} />
      <Route path="/" component={Dashboard} />
      <Route path="/meals" component={Meals} />
      <Route path="/history" component={History} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <AppContent />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;

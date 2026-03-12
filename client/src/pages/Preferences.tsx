import { useQuery } from "@tanstack/react-query";
import { Navbar } from "@/components/Navbar";
import { Link } from "wouter";
import { motion } from "framer-motion";
import {
  Users, Leaf, AlertCircle, CalendarDays, Moon, Heart,
  ThumbsDown, ShoppingCart, Package, Snowflake, Pencil, Loader2,
} from "lucide-react";

function Chip({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-secondary text-foreground border border-border/40">
      {label}
    </span>
  );
}

function EmptyValue() {
  return <span className="text-sm text-muted-foreground italic">Not set</span>;
}

function Section({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-4">
      <div className="mt-0.5 p-2 h-fit bg-primary/10 text-primary rounded-xl shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{title}</p>
        {children}
      </div>
    </div>
  );
}

export default function Preferences() {
  const { data: profile, isLoading } = useQuery<any>({ queryKey: ["/api/profile"] });

  // Parse CSV fields back to arrays
  const stores: string[] = profile?.groceryStore
    ? profile.groceryStore.split(",").map((s: string) => s.trim()).filter(Boolean)
    : [];
  const dislikes: string[] = profile?.dislikes
    ? profile.dislikes.split(",").map((s: string) => s.trim()).filter(Boolean)
    : [];

  const householdLabel = profile
    ? `${profile.adultCount ?? 0} adult${(profile.adultCount ?? 0) !== 1 ? "s" : ""}${
        (profile.kidCount ?? 0) > 0
          ? `, ${profile.kidCount} kid${profile.kidCount !== 1 ? "s" : ""}`
          : ""
      }`
    : null;

  const cookingLabel = profile?.cookingNights != null
    ? `${profile.cookingNights} night${profile.cookingNights !== 1 ? "s" : ""} per week`
    : null;

  const sections = [
    {
      icon: <Users size={16} />,
      title: "Household",
      content: householdLabel ? (
        <p className="text-sm font-semibold text-foreground">{householdLabel}</p>
      ) : <EmptyValue />,
    },
    {
      icon: <Leaf size={16} />,
      title: "Dietary Preferences",
      content: profile?.diets?.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {profile.diets.map((d: string) => <Chip key={d} label={d} />)}
        </div>
      ) : <EmptyValue />,
    },
    {
      icon: <AlertCircle size={16} />,
      title: "Allergies & Restrictions",
      content: profile?.allergies?.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {profile.allergies.map((a: string) => <Chip key={a} label={a} />)}
        </div>
      ) : <EmptyValue />,
    },
    {
      icon: <CalendarDays size={16} />,
      title: "Grocery Day",
      content: profile?.groceryDay ? (
        <p className="text-sm font-semibold text-foreground">{profile.groceryDay}</p>
      ) : <EmptyValue />,
    },
    {
      icon: <Moon size={16} />,
      title: "Cooking Nights",
      content: cookingLabel ? (
        <p className="text-sm font-semibold text-foreground">{cookingLabel}</p>
      ) : <EmptyValue />,
    },
    {
      icon: <Heart size={16} />,
      title: "Family Favorites",
      content: profile?.favoriteMeals?.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {profile.favoriteMeals.map((m: string) => <Chip key={m} label={m} />)}
        </div>
      ) : <EmptyValue />,
    },
    {
      icon: <ThumbsDown size={16} />,
      title: "Foods to Avoid",
      content: dislikes.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {dislikes.map((d) => <Chip key={d} label={d} />)}
        </div>
      ) : <EmptyValue />,
    },
    {
      icon: <ShoppingCart size={16} />,
      title: "Preferred Stores",
      content: stores.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {stores.map((s) => <Chip key={s} label={s} />)}
        </div>
      ) : <EmptyValue />,
    },
    {
      icon: <Package size={16} />,
      title: "Pantry Staples",
      content: profile?.pantryStaples?.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {profile.pantryStaples.map((p: string) => <Chip key={p} label={p} />)}
        </div>
      ) : <EmptyValue />,
    },
    {
      icon: <Snowflake size={16} />,
      title: "Freezer Items",
      content: profile?.freezerItems?.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {profile.freezerItems.map((f: string) => <Chip key={f} label={f} />)}
        </div>
      ) : <EmptyValue />,
    },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col pb-16">
      <Navbar />
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 sm:px-6 lg:px-8 mt-8">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>

          {/* Page header */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-2xl font-display font-bold text-foreground">Your Preferences</h1>
              <p className="text-sm text-muted-foreground mt-0.5">A summary of your meal planning setup</p>
            </div>
            <Link
              href="/onboarding"
              data-testid="button-edit-preferences"
              className="flex items-center gap-2 px-4 py-2.5 bg-foreground text-background rounded-xl text-sm font-semibold hover:bg-foreground/90 transition-colors shrink-0"
            >
              <Pencil size={14} />
              Edit
            </Link>
          </div>

          {/* Card */}
          <div className="bg-card rounded-3xl border border-border/40 premium-shadow overflow-hidden">
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 size={28} className="animate-spin text-primary" />
              </div>
            ) : (
              <div className="divide-y divide-border/40">
                {sections.map((s, i) => (
                  <div key={i} className="px-6 py-5">
                    <Section icon={s.icon} title={s.title}>
                      {s.content}
                    </Section>
                  </div>
                ))}
              </div>
            )}
          </div>

        </motion.div>
      </main>
    </div>
  );
}

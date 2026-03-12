import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Navbar } from "@/components/Navbar";
import { motion, AnimatePresence } from "framer-motion";
import { Pencil, X, Check, Loader2, Users, Leaf, AlertCircle, CalendarDays, Moon, Heart, ThumbsDown, ShoppingCart, Package, Snowflake } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// ── Option lists (mirrored from Onboarding) ─────────────────────────────────
const DIET_OPTIONS = ["None / No restrictions", "Vegetarian", "Vegan", "Gluten-Free", "Dairy-Free", "Halal", "Kosher", "Keto", "Paleo"];
const DIET_NONE = "None / No restrictions";
const ALLERGY_OPTIONS = ["None", "Tree Nuts", "Peanuts", "Dairy", "Eggs", "Shellfish", "Fish", "Wheat/Gluten", "Soy", "Sesame", "Other"];
const ALLERGY_NONE = "None";
const SHOPPING_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday", "No set day"];
const STORE_OPTIONS = ["Walmart", "Target", "Kroger", "Costco", "Whole Foods", "Trader Joe's", "Aldi", "Amazon Fresh", "Other"];
const DISLIKE_OPTIONS = ["Mushrooms", "Cilantro", "Onions", "Spicy food", "Seafood", "Broccoli", "Peas", "Brussels Sprouts", "Cauliflower", "Spinach", "Bell Peppers", "Olives", "Anchovies", "Eggplant", "Tofu", "Blue Cheese", "Sauerkraut", "Liver / Organ meats"];
const FAVORITE_OPTIONS = ["Tacos", "Spaghetti & Meatballs", "Grilled Chicken", "Homemade Pizza", "Burgers", "Mac & Cheese", "Sheet Pan Chicken & Veggies", "Stir Fry", "BBQ Chicken", "Soup & Sandwiches", "Breakfast for Dinner", "Chicken Casserole"];
const PANTRY_ALL = ["Olive Oil", "Vegetable Oil", "Butter", "Cooking Spray", "Salt", "Black Pepper", "Garlic Powder", "Onion Powder", "Paprika", "Cumin", "Red Pepper Flakes", "Italian Seasoning", "Soy Sauce", "Worcestershire Sauce", "Hot Sauce", "Honey", "White Vinegar", "Apple Cider Vinegar", "Garlic", "Onion", "Chicken Broth", "Beef Broth"];
const FREEZER_OPTIONS = ["Chicken Breasts", "Ground Beef", "Chicken Thighs", "Shrimp", "Salmon", "Pork Chops", "Italian Sausage", "Frozen Pizza", "Frozen Vegetables", "Edamame", "French Fries", "Ice Cream / Desserts", "Nothing in particular"];

interface Draft {
  diets: string[];
  allergies: string[];
  allergyOther: string;
  adultCount: number;
  kidCount: number;
  groceryDay: string;
  cookingNights: number;
  dislikes: string[];
  dislikesOther: string;
  groceryStores: string[];
  groceryStoreOther: string;
  favoriteMeals: string[];
  pantryStaples: string[];
  freezerItems: string[];
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function parseCSV(val: string | null | undefined): string[] {
  if (!val) return [];
  return val.split(",").map(s => s.trim()).filter(Boolean);
}

function profileToDraft(p: any): Draft {
  const storeArr = parseCSV(p.groceryStore);
  const knownStores = STORE_OPTIONS.filter(o => o !== "Other");
  const otherStores = storeArr.filter(s => !knownStores.includes(s));
  const groceryStores = storeArr.filter(s => knownStores.includes(s));
  if (otherStores.length > 0) groceryStores.push("Other");

  const dislikeArr = parseCSV(p.dislikes);
  const otherDislikes = dislikeArr.filter(s => !DISLIKE_OPTIONS.includes(s));
  const dislikes = dislikeArr.filter(s => DISLIKE_OPTIONS.includes(s));

  const allergyArr: string[] = p.allergies ?? [];
  const knownAllergies = ALLERGY_OPTIONS.filter(o => o !== "Other");
  const otherAllergies = allergyArr.filter(s => !knownAllergies.includes(s));
  const allergies = allergyArr.filter(s => knownAllergies.includes(s));
  if (otherAllergies.length > 0) allergies.push("Other");

  return {
    diets: p.diets ?? [],
    allergies,
    allergyOther: otherAllergies.join(", "),
    adultCount: p.adultCount ?? 2,
    kidCount: p.kidCount ?? 0,
    groceryDay: p.groceryDay ?? "",
    cookingNights: p.cookingNights ?? 5,
    dislikes,
    dislikesOther: otherDislikes.join(", "),
    groceryStores,
    groceryStoreOther: otherStores.join(", "),
    favoriteMeals: p.favoriteMeals ?? [],
    pantryStaples: p.pantryStaples ?? [],
    freezerItems: p.freezerItems ?? [],
  };
}

function draftToPayload(d: Draft) {
  const allergies = [...d.allergies.filter(a => a !== "Other")];
  if (d.allergyOther.trim()) {
    d.allergyOther.split(",").map(s => s.trim()).filter(Boolean).forEach(s => allergies.push(s));
  }
  const dislikeParts = [...d.dislikes];
  if (d.dislikesOther.trim()) dislikeParts.push(...d.dislikesOther.split(",").map(s => s.trim()).filter(Boolean));
  const storeParts = [...d.groceryStores.filter(s => s !== "Other")];
  if (d.groceryStoreOther.trim()) storeParts.push(...d.groceryStoreOther.split(",").map(s => s.trim()).filter(Boolean));
  return {
    diets: d.diets,
    allergies,
    adultCount: d.adultCount,
    kidCount: d.kidCount,
    groceryDay: d.groceryDay,
    cookingNights: d.cookingNights,
    dislikes: dislikeParts.join(", "),
    groceryStore: storeParts.join(", "),
    favoriteMeals: d.favoriteMeals,
    pantryStaples: d.pantryStaples,
    freezerItems: d.freezerItems,
  };
}

// ── Small UI pieces ──────────────────────────────────────────────────────────
function ViewChips({ values }: { values: string[] }) {
  if (!values.length) return <span className="text-sm text-muted-foreground italic">Not set</span>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {values.map(v => (
        <span key={v} className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-secondary text-foreground border border-border/40">{v}</span>
      ))}
    </div>
  );
}

function ViewText({ value }: { value: string | null | undefined }) {
  if (!value) return <span className="text-sm text-muted-foreground italic">Not set</span>;
  return <span className="text-sm font-semibold text-foreground">{value}</span>;
}

function EditChips({
  options, selected, onToggle, max, mutualNone,
}: {
  options: string[];
  selected: string[];
  onToggle: (v: string) => void;
  max?: number;
  mutualNone?: string;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(opt => {
        const on = selected.includes(opt);
        const isNone = opt === mutualNone;
        const disabled = !on && max !== undefined && selected.filter(s => s !== mutualNone).length >= max && !isNone;
        return (
          <button
            key={opt}
            type="button"
            disabled={disabled}
            onClick={() => onToggle(opt)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-sm font-medium transition-all disabled:opacity-30 ${
              on ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border text-foreground hover:border-primary/50"
            }`}
          >
            {on && <Check size={13} />}
            {opt}
          </button>
        );
      })}
    </div>
  );
}

function MiniStepper({ label, value, onChange, min = 0, max = 10 }: { label: string; value: number; onChange: (v: number) => void; min?: number; max?: number }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-sm font-semibold text-foreground">{label}</span>
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min}
          className="w-8 h-8 rounded-xl border border-border bg-background flex items-center justify-center font-bold disabled:opacity-30 hover:border-primary/50 transition-colors text-lg leading-none">−</button>
        <span className="w-6 text-center font-bold text-lg">{value}</span>
        <button type="button" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max}
          className="w-8 h-8 rounded-xl border border-border bg-background flex items-center justify-center font-bold disabled:opacity-30 hover:border-primary/50 transition-colors text-lg leading-none">+</button>
      </div>
    </div>
  );
}

function SectionRow({ icon, title, viewContent, editContent, editing }: {
  icon: React.ReactNode; title: string;
  viewContent: React.ReactNode; editContent: React.ReactNode;
  editing: boolean;
}) {
  return (
    <div className="px-6 py-5 border-b border-border/40 last:border-0">
      <div className="flex gap-4">
        <div className="mt-0.5 p-2 h-fit bg-primary/10 text-primary rounded-xl shrink-0">{icon}</div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{title}</p>
          <AnimatePresence mode="wait" initial={false}>
            {editing ? (
              <motion.div key="edit" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.15 }}>
                {editContent}
              </motion.div>
            ) : (
              <motion.div key="view" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
                {viewContent}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function Preferences() {
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);

  const { data: profile, isLoading } = useQuery<any>({ queryKey: ["/api/profile"] });

  useEffect(() => {
    if (profile) setDraft(profileToDraft(profile));
  }, [profile]);

  const saveMutation = useMutation({
    mutationFn: (payload: any) => apiRequest("POST", "/api/profile", payload).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
      setEditing(false);
      toast({ title: "Preferences saved!", description: "Your updates will be reflected going forward." });
    },
    onError: () => toast({ title: "Something went wrong", description: "Please try again.", variant: "destructive" }),
  });

  const handleSave = () => {
    if (!draft) return;
    saveMutation.mutate(draftToPayload(draft));
  };

  const handleCancel = () => {
    if (profile) setDraft(profileToDraft(profile));
    setEditing(false);
  };

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft(d => d ? { ...d, [key]: value } : d);

  const toggleChip = (key: keyof Draft, opt: string, noneVal?: string, max?: number) => {
    setDraft(d => {
      if (!d) return d;
      const arr = d[key] as string[];
      const has = arr.includes(opt);
      let next: string[];
      if (has) {
        next = arr.filter(v => v !== opt);
      } else {
        if (opt === noneVal) {
          next = [opt];
        } else {
          next = arr.filter(v => v !== noneVal);
          if (max === undefined || next.length < max) next = [...next, opt];
        }
      }
      return { ...d, [key]: next };
    });
  };

  if (isLoading || !draft) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 size={28} className="animate-spin text-primary" />
        </div>
      </div>
    );
  }

  // Build display values from profile for view mode
  const stores = parseCSV(profile?.groceryStore);
  const dislikes = parseCSV(profile?.dislikes);
  const householdLabel = `${profile?.adultCount ?? 0} adult${(profile?.adultCount ?? 0) !== 1 ? "s" : ""}${(profile?.kidCount ?? 0) > 0 ? `, ${profile.kidCount} kid${profile.kidCount !== 1 ? "s" : ""}` : ""}`;
  const cookingLabel = profile?.cookingNights != null ? `${profile.cookingNights} night${profile.cookingNights !== 1 ? "s" : ""} per week` : null;

  return (
    <div className="min-h-screen bg-background flex flex-col pb-16">
      <Navbar />
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 sm:px-6 lg:px-8 mt-8">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>

          {/* Page header */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-2xl font-display font-bold text-foreground">Your Preferences</h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                {editing ? "Make your changes below, then save." : "A summary of your meal planning setup"}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {editing ? (
                <>
                  <button onClick={handleCancel} data-testid="button-cancel-edit"
                    className="flex items-center gap-1.5 px-4 py-2.5 bg-secondary text-foreground rounded-xl text-sm font-semibold hover:bg-secondary/80 transition-colors">
                    <X size={14} /> Cancel
                  </button>
                  <button onClick={handleSave} disabled={saveMutation.isPending} data-testid="button-save-preferences"
                    className="flex items-center gap-1.5 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-bold hover:bg-primary/90 transition-colors disabled:opacity-60 shadow-md shadow-primary/20">
                    {saveMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <><Check size={14} />Save</>}
                  </button>
                </>
              ) : (
                <button onClick={() => setEditing(true)} data-testid="button-edit-preferences"
                  className="flex items-center gap-2 px-4 py-2.5 bg-foreground text-background rounded-xl text-sm font-semibold hover:bg-foreground/90 transition-colors">
                  <Pencil size={14} /> Edit
                </button>
              )}
            </div>
          </div>

          {/* Card */}
          <div className="bg-card rounded-3xl border border-border/40 premium-shadow overflow-hidden">

            {/* Household */}
            <SectionRow icon={<Users size={16} />} title="Household" editing={editing}
              viewContent={<ViewText value={householdLabel} />}
              editContent={
                <div className="space-y-2">
                  <MiniStepper label="Adults" value={draft.adultCount} min={1} max={10} onChange={v => set("adultCount", v)} />
                  <MiniStepper label="Kids" value={draft.kidCount} min={0} max={10} onChange={v => set("kidCount", v)} />
                </div>
              }
            />

            {/* Dietary Preferences */}
            <SectionRow icon={<Leaf size={16} />} title="Dietary Preferences" editing={editing}
              viewContent={<ViewChips values={profile?.diets ?? []} />}
              editContent={
                <EditChips options={DIET_OPTIONS} selected={draft.diets} mutualNone={DIET_NONE}
                  onToggle={opt => toggleChip("diets", opt, DIET_NONE)} />
              }
            />

            {/* Allergies */}
            <SectionRow icon={<AlertCircle size={16} />} title="Allergies & Restrictions" editing={editing}
              viewContent={<ViewChips values={profile?.allergies ?? []} />}
              editContent={
                <div className="space-y-3">
                  <EditChips options={ALLERGY_OPTIONS} selected={draft.allergies} mutualNone={ALLERGY_NONE}
                    onToggle={opt => toggleChip("allergies", opt, ALLERGY_NONE)} />
                  {draft.allergies.includes("Other") && (
                    <input value={draft.allergyOther} onChange={e => set("allergyOther", e.target.value)}
                      placeholder="Describe your allergy…"
                      className="w-full px-4 py-2.5 rounded-xl text-sm bg-secondary/50 border border-transparent focus:border-primary/30 focus:bg-background focus:ring-4 focus:ring-primary/10 transition-all outline-none" />
                  )}
                </div>
              }
            />

            {/* Grocery Day */}
            <SectionRow icon={<CalendarDays size={16} />} title="Grocery Day" editing={editing}
              viewContent={<ViewText value={profile?.groceryDay} />}
              editContent={
                <div className="flex flex-wrap gap-2">
                  {SHOPPING_DAYS.map(day => {
                    const on = draft.groceryDay === day;
                    return (
                      <button key={day} type="button" onClick={() => set("groceryDay", day)}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-sm font-medium transition-all ${on ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border text-foreground hover:border-primary/50"}`}>
                        {on && <Check size={13} />}{day}
                      </button>
                    );
                  })}
                </div>
              }
            />

            {/* Cooking Nights */}
            <SectionRow icon={<Moon size={16} />} title="Cooking Nights" editing={editing}
              viewContent={<ViewText value={cookingLabel} />}
              editContent={
                <MiniStepper label="Nights per week" value={draft.cookingNights} min={1} max={7} onChange={v => set("cookingNights", v)} />
              }
            />

            {/* Family Favorites */}
            <SectionRow icon={<Heart size={16} />} title="Family Favorites" editing={editing}
              viewContent={<ViewChips values={profile?.favoriteMeals ?? []} />}
              editContent={
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Pick up to 3</p>
                  <EditChips options={FAVORITE_OPTIONS} selected={draft.favoriteMeals} max={3}
                    onToggle={opt => toggleChip("favoriteMeals", opt, undefined, 3)} />
                </div>
              }
            />

            {/* Foods to Avoid */}
            <SectionRow icon={<ThumbsDown size={16} />} title="Foods to Avoid" editing={editing}
              viewContent={<ViewChips values={dislikes} />}
              editContent={
                <div className="space-y-3">
                  <EditChips options={DISLIKE_OPTIONS} selected={draft.dislikes}
                    onToggle={opt => toggleChip("dislikes", opt)} />
                  <input value={draft.dislikesOther} onChange={e => set("dislikesOther", e.target.value)}
                    placeholder="Anything else? (e.g. anchovies, cilantro)"
                    className="w-full px-4 py-2.5 rounded-xl text-sm bg-secondary/50 border border-transparent focus:border-primary/30 focus:bg-background focus:ring-4 focus:ring-primary/10 transition-all outline-none" />
                </div>
              }
            />

            {/* Preferred Stores */}
            <SectionRow icon={<ShoppingCart size={16} />} title="Preferred Stores" editing={editing}
              viewContent={<ViewChips values={stores} />}
              editContent={
                <div className="space-y-3">
                  <EditChips options={STORE_OPTIONS} selected={draft.groceryStores}
                    onToggle={opt => toggleChip("groceryStores", opt)} />
                  {draft.groceryStores.includes("Other") && (
                    <input value={draft.groceryStoreOther} onChange={e => set("groceryStoreOther", e.target.value)}
                      placeholder="Which store?"
                      className="w-full px-4 py-2.5 rounded-xl text-sm bg-secondary/50 border border-transparent focus:border-primary/30 focus:bg-background focus:ring-4 focus:ring-primary/10 transition-all outline-none" />
                  )}
                </div>
              }
            />

            {/* Pantry Staples */}
            <SectionRow icon={<Package size={16} />} title="Pantry Staples" editing={editing}
              viewContent={<ViewChips values={profile?.pantryStaples ?? []} />}
              editContent={
                <EditChips options={PANTRY_ALL} selected={draft.pantryStaples}
                  onToggle={opt => toggleChip("pantryStaples", opt)} />
              }
            />

            {/* Freezer Items */}
            <SectionRow icon={<Snowflake size={16} />} title="Freezer Items" editing={editing}
              viewContent={<ViewChips values={profile?.freezerItems ?? []} />}
              editContent={
                <EditChips options={FREEZER_OPTIONS} selected={draft.freezerItems}
                  onToggle={opt => toggleChip("freezerItems", opt)} />
              }
            />

          </div>
        </motion.div>
      </main>
    </div>
  );
}

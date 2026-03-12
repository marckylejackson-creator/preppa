import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, ChevronLeft, Check, Loader2, UtensilsCrossed, ArrowLeft } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import logoPath from "@assets/preppa_logo_orange_1_1773037358063.png";

// ─── Types ──────────────────────────────────────────────────────────────────
interface Answers {
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

const DEFAULT: Answers = {
  diets: [],
  allergies: [],
  allergyOther: "",
  adultCount: 2,
  kidCount: 0,
  groceryDay: "",
  cookingNights: 5,
  dislikes: [],
  dislikesOther: "",
  groceryStores: [],
  groceryStoreOther: "",
  favoriteMeals: [],
  pantryStaples: [],
  freezerItems: [],
};

// ─── Option lists ────────────────────────────────────────────────────────────
const DIET_OPTIONS = ["None / No restrictions", "Vegetarian", "Vegan", "Gluten-Free", "Dairy-Free", "Halal", "Kosher", "Keto", "Paleo"];
const DIET_NONE = "None / No restrictions";

const ALLERGY_OPTIONS = ["None", "Tree Nuts", "Peanuts", "Dairy", "Eggs", "Shellfish", "Fish", "Wheat/Gluten", "Soy", "Sesame", "Other"];
const ALLERGY_NONE = "None";

const SHOPPING_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday", "No set day"];

const STORE_OPTIONS = ["Walmart", "Target", "Kroger", "Costco", "Whole Foods", "Trader Joe's", "Aldi", "Amazon Fresh", "Other"];

const DISLIKE_OPTIONS = [
  "Mushrooms", "Cilantro", "Onions", "Spicy food", "Seafood",
  "Broccoli", "Peas", "Brussels Sprouts", "Cauliflower", "Spinach",
  "Bell Peppers", "Olives", "Anchovies", "Eggplant", "Tofu",
  "Blue Cheese", "Sauerkraut", "Liver / Organ meats",
];

const FAVORITE_OPTIONS = [
  "Tacos", "Spaghetti & Meatballs", "Grilled Chicken", "Homemade Pizza",
  "Burgers", "Mac & Cheese", "Sheet Pan Chicken & Veggies", "Stir Fry",
  "BBQ Chicken", "Soup & Sandwiches", "Breakfast for Dinner", "Chicken Casserole",
];

const PANTRY_GROUPS = [
  { label: "Oils & Fats", items: ["Olive Oil", "Vegetable Oil", "Butter", "Cooking Spray"] },
  { label: "Spices & Seasonings", items: ["Salt", "Black Pepper", "Garlic Powder", "Onion Powder", "Paprika", "Cumin", "Red Pepper Flakes", "Italian Seasoning"] },
  { label: "Vinegars & Sauces", items: ["Soy Sauce", "Worcestershire Sauce", "Hot Sauce", "Honey", "White Vinegar", "Apple Cider Vinegar"] },
  { label: "Pantry Basics", items: ["Garlic", "Onion", "Chicken Broth", "Beef Broth"] },
];

const FREEZER_OPTIONS = [
  "Chicken Breasts", "Ground Beef", "Chicken Thighs", "Shrimp", "Salmon",
  "Pork Chops", "Italian Sausage", "Frozen Pizza", "Frozen Vegetables",
  "Edamame", "French Fries", "Ice Cream / Desserts", "Nothing in particular",
];

// ─── Steps ───────────────────────────────────────────────────────────────────
const STEPS = [
  { id: "diets",         title: "Does anyone in your household follow a specific diet?",   hint: "Select all that apply — we'll keep every meal in range." },
  { id: "allergies",     title: "Any food allergies we should avoid?",                      hint: "We take this seriously. Pick everything that applies." },
  { id: "household",     title: "Who's eating with you?",                                   hint: "Helps us size recipes and keep things kid-friendly when needed." },
  { id: "groceryDay",    title: "What day do you usually shop for groceries?",              hint: "We'll build your plan around your shopping trip." },
  { id: "cookingNights", title: "How many nights a week do you plan to cook?",              hint: "No pressure — even 3 nights is a win." },
  { id: "dislikes",      title: "Any foods your household dislikes or avoids?",             hint: "We'll quietly keep these off the menu." },
  { id: "groceryStore",  title: "Where do you usually shop?",                               hint: "We can format quantities to match how each store sells things." },
  { id: "favorites",     title: "Which of these does your family already love?",            hint: "Pick up to 3 — we'll make sure they show up in your plans." },
  { id: "pantry",        title: "Which pantry staples do you usually keep stocked?",        hint: "Anything you select here won't show up on your grocery list." },
  { id: "freezer",       title: "What do you usually have in your freezer?",                hint: "Great for quick swaps and skipping extra store runs." },
];

// ─── Reusable chip helpers ────────────────────────────────────────────────────
function chipClass(on: boolean) {
  return `flex items-center gap-1.5 px-3 py-2 rounded-xl border text-sm font-medium transition-colors ${
    on
      ? "bg-primary text-primary-foreground border-primary"
      : "bg-background border-border text-foreground hover:border-primary/50"
  }`;
}

function Stepper({ label, value, onChange, min = 0, max = 10 }: { label: string; value: number; onChange: (v: number) => void; min?: number; max?: number }) {
  return (
    <div className="flex flex-col items-center gap-3">
      <span className="text-sm font-semibold text-muted-foreground">{label}</span>
      <div className="flex items-center gap-4">
        <motion.button type="button" whileTap={{ scale: 0.9 }}
          onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min}
          className="w-11 h-11 rounded-2xl border border-border bg-background flex items-center justify-center text-xl font-bold disabled:opacity-30 hover:border-primary/50 transition-colors"
          data-testid={`button-${label.toLowerCase()}-minus`}
        >−</motion.button>
        <motion.span key={value} initial={{ scale: 0.75, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          className="text-4xl font-bold font-display w-12 text-center"
        >{value}</motion.span>
        <motion.button type="button" whileTap={{ scale: 0.9 }}
          onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max}
          className="w-11 h-11 rounded-2xl border border-border bg-background flex items-center justify-center text-xl font-bold disabled:opacity-30 hover:border-primary/50 transition-colors"
          data-testid={`button-${label.toLowerCase()}-plus`}
        >+</motion.button>
      </div>
    </div>
  );
}

// ─── Celebration screen ───────────────────────────────────────────────────────
const DECIDING_MESSAGES = [
  "Checking what's in season…",
  "Balancing veggies and comfort food…",
  "Making sure there's at least one easy night…",
  "Almost ready for your first week!",
];

function CelebrationScreen() {
  const [msgIdx] = useState(() => Math.floor(Math.random() * DECIDING_MESSAGES.length));
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 bg-background flex flex-col items-center justify-center gap-6 z-50 px-8 text-center"
    >
      <motion.div
        animate={{ rotate: [0, -8, 8, -8, 8, 0], scale: [1, 1.1, 1] }}
        transition={{ duration: 1.2, repeat: Infinity, repeatDelay: 0.8 }}
        className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center"
      >
        <UtensilsCrossed size={36} className="text-primary" />
      </motion.div>
      <div>
        <h2 className="text-2xl font-bold mb-2">We're deciding what's for dinner…</h2>
        <motion.p
          key={msgIdx}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-muted-foreground text-sm"
        >
          {DECIDING_MESSAGES[msgIdx]}
        </motion.p>
      </div>
      <div className="flex gap-2 mt-2">
        {[0, 1, 2].map(i => (
          <motion.div
            key={i}
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.3 }}
            className="w-2 h-2 rounded-full bg-primary"
          />
        ))}
      </div>
    </motion.div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function Onboarding() {
  const [location, navigate] = useLocation();
  const isEditing = location === "/preferences";
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [answers, setAnswers] = useState<Answers>(DEFAULT);
  const [showCelebration, setShowCelebration] = useState(false);

  // Pre-fill existing profile data when in edit mode
  const { data: existingProfile } = useQuery<any>({
    queryKey: ["/api/profile"],
    enabled: isEditing,
  });

  useEffect(() => {
    if (!existingProfile) return;
    const p = existingProfile;
    // Rehydrate stores: stored as "Walmart, Trader Joe's" CSV
    const storeArr = p.groceryStore ? p.groceryStore.split(",").map((s: string) => s.trim()) : [];
    const knownStores = STORE_OPTIONS.filter(o => o !== "Other");
    const otherStores = storeArr.filter((s: string) => !knownStores.includes(s));
    const groceryStores = storeArr.filter((s: string) => knownStores.includes(s));
    if (otherStores.length > 0) groceryStores.push("Other");

    // Rehydrate dislikes
    const dislikeArr = p.dislikes ? p.dislikes.split(",").map((s: string) => s.trim()) : [];
    const knownDislikes = DISLIKE_OPTIONS;
    const otherDislikes = dislikeArr.filter((s: string) => !knownDislikes.includes(s));
    const dislikes = dislikeArr.filter((s: string) => knownDislikes.includes(s));

    // Rehydrate allergies
    const knownAllergies = ALLERGY_OPTIONS.filter(o => o !== "Other");
    const allergyArr: string[] = p.allergies ?? [];
    const otherAllergies = allergyArr.filter((s: string) => !knownAllergies.includes(s));
    const allergies = allergyArr.filter((s: string) => knownAllergies.includes(s));
    if (otherAllergies.length > 0) allergies.push("Other");

    setAnswers({
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
      pantryStaples: [],
      freezerItems: p.freezerItems ?? [],
    });
  }, [existingProfile]);

  const total = STEPS.length;
  const progress = ((step + 1) / total) * 100;
  const currentStep = STEPS[step];

  const set = <K extends keyof Answers>(key: K, val: Answers[K]) =>
    setAnswers(prev => ({ ...prev, [key]: val }));

  // Toggle with mutual exclusion for "none" options
  const toggleExclusive = (list: string[], opt: string, noneKey: string): string[] => {
    if (opt === noneKey) return list.includes(opt) ? [] : [opt];
    const without = list.filter(x => x !== noneKey);
    return without.includes(opt) ? without.filter(x => x !== opt) : [...without, opt];
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const allergyList = [
        ...answers.allergies.filter(a => a !== "Other"),
        ...(answers.allergyOther.trim() ? [answers.allergyOther.trim()] : []),
      ];
      const dislikeList = [
        ...answers.dislikes,
        ...(answers.dislikesOther.trim() ? [answers.dislikesOther.trim()] : []),
      ];
      const storeList = [
        ...answers.groceryStores.filter(s => s !== "Other"),
        ...(answers.groceryStoreOther.trim() ? [answers.groceryStoreOther.trim()] : []),
      ];
      const body = {
        diets: answers.diets,
        allergies: allergyList,
        adultCount: answers.adultCount,
        kidCount: answers.kidCount,
        groceryDay: answers.groceryDay || undefined,
        cookingNights: answers.cookingNights,
        dislikes: dislikeList.join(", ") || undefined,
        groceryStore: storeList.join(", ") || undefined,
        favoriteMeals: answers.favoriteMeals,
        freezerItems: answers.freezerItems,
        pantryStaples: answers.pantryStaples,
      };
      const res = await apiRequest("POST", "/api/profile", body);
      return res.json();
    },
    onSuccess: () => {
      if (answers.pantryStaples.length > 0) {
        localStorage.setItem("preppa_pantry_setup_done", "true");
      }
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
      if (isEditing) {
        toast({ title: "Preferences saved!", description: "Your meal plans will reflect your updates going forward." });
        navigate("/");
      } else {
        setShowCelebration(true);
        setTimeout(() => navigate("/"), 3000);
      }
    },
    onError: () => {
      toast({ title: "Something went wrong", description: "Please try again.", variant: "destructive" });
    },
  });

  const goNext = () => {
    if (step < total - 1) { setDirection(1); setStep(s => s + 1); }
    else saveMutation.mutate();
  };
  const goBack = () => {
    if (step > 0) { setDirection(-1); setStep(s => s - 1); }
  };

  const canContinue = () => {
    if (currentStep.id === "groceryDay") return answers.groceryDay !== "";
    if (currentStep.id === "groceryStore") return answers.groceryStores.length > 0;
    return true;
  };

  const variants = {
    enter: (dir: number) => ({ x: dir > 0 ? 44 : -44, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? -44 : 44, opacity: 0 }),
  };

  if (showCelebration) return <CelebrationScreen />;

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg">
        {isEditing ? (
          <div className="flex items-center gap-3 mb-8">
            <button
              onClick={() => navigate("/")}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              data-testid="button-back-to-dashboard"
            >
              <ArrowLeft size={15} />
              Back to dashboard
            </button>
            <span className="text-muted-foreground/40">·</span>
            <span className="text-sm font-semibold text-foreground">Edit Preferences</span>
          </div>
        ) : (
          <div className="flex justify-center mb-8">
            <img src={logoPath} alt="Preppa" className="h-9" />
          </div>
        )}

        <div className="bg-card rounded-3xl border border-border/40 shadow-xl overflow-hidden">
          {/* Progress bar */}
          <div className="h-1.5 bg-muted">
            <motion.div className="h-full bg-primary rounded-full"
              animate={{ width: `${progress}%` }} transition={{ duration: 0.4, ease: "easeOut" }} />
          </div>

          {/* Header row */}
          <div className="flex justify-between items-center px-6 pt-5 pb-1">
            <span className="text-xs font-medium text-muted-foreground">{step + 1} of {total}</span>
            <button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
              data-testid="button-skip-onboarding">
              Skip for now
            </button>
          </div>

          {/* Step body */}
          <div className="px-6 pb-6 min-h-[360px] flex flex-col">
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div key={step} custom={direction} variants={variants}
                initial="enter" animate="center" exit="exit"
                transition={{ duration: 0.26, ease: "easeOut" }}
                className="flex-1 flex flex-col"
              >
                <div className="mb-5 mt-2">
                  <h2 className="text-xl font-bold leading-snug mb-1">{currentStep.title}</h2>
                  <p className="text-sm text-muted-foreground">{currentStep.hint}</p>
                </div>

                <div className="flex-1">

                  {/* 1. Diet */}
                  {currentStep.id === "diets" && (
                    <div className="flex flex-wrap gap-2">
                      {DIET_OPTIONS.map(opt => {
                        const on = answers.diets.includes(opt);
                        return (
                          <motion.button key={opt} type="button" whileTap={{ scale: 0.95 }}
                            onClick={() => set("diets", toggleExclusive(answers.diets, opt, DIET_NONE))}
                            data-testid={`chip-diet-${opt.toLowerCase().replace(/\s+/g, "-")}`}
                            className={chipClass(on)}>
                            {on && <Check size={12} strokeWidth={3} />}{opt}
                          </motion.button>
                        );
                      })}
                    </div>
                  )}

                  {/* 2. Allergies */}
                  {currentStep.id === "allergies" && (
                    <div className="space-y-3">
                      <div className="flex flex-wrap gap-2">
                        {ALLERGY_OPTIONS.map(opt => {
                          const on = answers.allergies.includes(opt);
                          return (
                            <motion.button key={opt} type="button" whileTap={{ scale: 0.95 }}
                              onClick={() => set("allergies", toggleExclusive(answers.allergies, opt, ALLERGY_NONE))}
                              data-testid={`chip-allergy-${opt.toLowerCase().replace(/\s+/g, "-")}`}
                              className={chipClass(on)}>
                              {on && <Check size={12} strokeWidth={3} />}{opt}
                            </motion.button>
                          );
                        })}
                      </div>
                      <AnimatePresence>
                        {answers.allergies.includes("Other") && (
                          <motion.input
                            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                            type="text" value={answers.allergyOther}
                            onChange={e => set("allergyOther", e.target.value)}
                            placeholder="e.g. Sesame, Mustard, Latex…"
                            data-testid="input-allergy-other"
                            className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                          />
                        )}
                      </AnimatePresence>
                    </div>
                  )}

                  {/* 3. Household (adults + kids combined) */}
                  {currentStep.id === "household" && (
                    <div className="flex gap-10 justify-center pt-2">
                      <Stepper label="Adults" value={answers.adultCount} onChange={v => set("adultCount", v)} min={1} max={10} />
                      <Stepper label="Kids" value={answers.kidCount} onChange={v => set("kidCount", v)} min={0} max={10} />
                    </div>
                  )}

                  {/* 4. Grocery day */}
                  {currentStep.id === "groceryDay" && (
                    <div className="flex flex-wrap gap-2">
                      {SHOPPING_DAYS.map(opt => {
                        const on = answers.groceryDay === opt;
                        return (
                          <motion.button key={opt} type="button" whileTap={{ scale: 0.95 }}
                            onClick={() => set("groceryDay", on ? "" : opt)}
                            data-testid={`chip-day-${opt.toLowerCase().replace(/\s+/g, "-")}`}
                            className={chipClass(on)}>
                            {on && <Check size={12} strokeWidth={3} />}{opt}
                          </motion.button>
                        );
                      })}
                    </div>
                  )}

                  {/* 5. Cooking nights */}
                  {currentStep.id === "cookingNights" && (
                    <Stepper label="Nights per week" value={answers.cookingNights} onChange={v => set("cookingNights", v)} min={1} max={7} />
                  )}

                  {/* 6. Dislikes — chips + free text */}
                  {currentStep.id === "dislikes" && (
                    <div className="space-y-3">
                      <div className="flex flex-wrap gap-2">
                        {DISLIKE_OPTIONS.map(opt => {
                          const on = answers.dislikes.includes(opt);
                          return (
                            <motion.button key={opt} type="button" whileTap={{ scale: 0.95 }}
                              onClick={() => set("dislikes", on ? answers.dislikes.filter(x => x !== opt) : [...answers.dislikes, opt])}
                              data-testid={`chip-dislike-${opt.toLowerCase().replace(/\s+/g, "-")}`}
                              className={chipClass(on)}>
                              {on && <Check size={12} strokeWidth={3} />}{opt}
                            </motion.button>
                          );
                        })}
                      </div>
                      <input
                        type="text" value={answers.dislikesOther}
                        onChange={e => set("dislikesOther", e.target.value)}
                        placeholder="Anything else? e.g. kimchi, lamb, black licorice…"
                        data-testid="input-dislikes-other"
                        className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </div>
                  )}

                  {/* 7. Grocery store — multi-select + Other text */}
                  {currentStep.id === "groceryStore" && (
                    <div className="space-y-3">
                      <div className="flex flex-wrap gap-2">
                        {STORE_OPTIONS.map(opt => {
                          const on = answers.groceryStores.includes(opt);
                          return (
                            <motion.button key={opt} type="button" whileTap={{ scale: 0.95 }}
                              onClick={() => set("groceryStores", on ? answers.groceryStores.filter(x => x !== opt) : [...answers.groceryStores, opt])}
                              data-testid={`chip-store-${opt.toLowerCase().replace(/\s+/g, "-")}`}
                              className={chipClass(on)}>
                              {on && <Check size={12} strokeWidth={3} />}{opt}
                            </motion.button>
                          );
                        })}
                      </div>
                      <AnimatePresence>
                        {answers.groceryStores.includes("Other") && (
                          <motion.input
                            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                            type="text" value={answers.groceryStoreOther}
                            onChange={e => set("groceryStoreOther", e.target.value)}
                            placeholder="Which store do you use?"
                            data-testid="input-store-other"
                            className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                          />
                        )}
                      </AnimatePresence>
                    </div>
                  )}

                  {/* 8. Family favorites — pick up to 3 */}
                  {currentStep.id === "favorites" && (
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-2">
                        {FAVORITE_OPTIONS.map(opt => {
                          const on = answers.favoriteMeals.includes(opt);
                          const maxed = answers.favoriteMeals.length >= 3 && !on;
                          return (
                            <motion.button key={opt} type="button" whileTap={{ scale: 0.95 }}
                              disabled={maxed}
                              onClick={() => set("favoriteMeals", on ? answers.favoriteMeals.filter(x => x !== opt) : [...answers.favoriteMeals, opt])}
                              data-testid={`chip-fav-${opt.toLowerCase().replace(/\s+/g, "-")}`}
                              className={`${chipClass(on)} disabled:opacity-30`}>
                              {on && <Check size={12} strokeWidth={3} />}{opt}
                            </motion.button>
                          );
                        })}
                      </div>
                      <p className="text-xs text-muted-foreground pt-1">
                        {answers.favoriteMeals.length}/3 selected
                      </p>
                    </div>
                  )}

                  {/* 9. Pantry staples */}
                  {currentStep.id === "pantry" && (
                    <div className="space-y-4 max-h-52 overflow-y-auto pr-1">
                      {PANTRY_GROUPS.map(group => (
                        <div key={group.label}>
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{group.label}</p>
                          <div className="flex flex-wrap gap-2">
                            {group.items.map(item => {
                              const on = answers.pantryStaples.includes(item);
                              return (
                                <motion.button key={item} type="button" whileTap={{ scale: 0.95 }}
                                  onClick={() => set("pantryStaples", on ? answers.pantryStaples.filter(x => x !== item) : [...answers.pantryStaples, item])}
                                  data-testid={`chip-pantry-${item.toLowerCase().replace(/\s+/g, "-")}`}
                                  className={chipClass(on)}>
                                  {on && <Check size={12} strokeWidth={3} />}{item}
                                </motion.button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* 10. Freezer items */}
                  {currentStep.id === "freezer" && (
                    <div className="flex flex-wrap gap-2">
                      {FREEZER_OPTIONS.map(opt => {
                        const on = answers.freezerItems.includes(opt);
                        return (
                          <motion.button key={opt} type="button" whileTap={{ scale: 0.95 }}
                            onClick={() => set("freezerItems", on ? answers.freezerItems.filter(x => x !== opt) : [...answers.freezerItems, opt])}
                            data-testid={`chip-freezer-${opt.toLowerCase().replace(/\s+/g, "-")}`}
                            className={chipClass(on)}>
                            {on && <Check size={12} strokeWidth={3} />}{opt}
                          </motion.button>
                        );
                      })}
                    </div>
                  )}

                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Footer nav */}
          <div className="px-6 pb-6 flex items-center gap-3">
            {step > 0 && (
              <motion.button type="button" whileTap={{ scale: 0.96 }} onClick={goBack}
                data-testid="button-onboarding-back"
                className="flex items-center gap-1.5 px-4 py-3 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors">
                <ChevronLeft size={16} /> Back
              </motion.button>
            )}
            <motion.button type="button" whileTap={{ scale: 0.97 }} onClick={goNext}
              disabled={!canContinue() || saveMutation.isPending}
              data-testid="button-onboarding-next"
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-foreground text-background rounded-xl font-semibold text-sm hover:bg-foreground/90 transition-all disabled:opacity-40">
              {saveMutation.isPending
                ? <Loader2 size={16} className="animate-spin" />
                : <>{step === total - 1 ? (isEditing ? "Save changes" : "Let's go!") : "Continue"}{step < total - 1 && <ChevronRight size={16} />}</>
              }
            </motion.button>
          </div>
        </div>
      </div>
    </div>
  );
}

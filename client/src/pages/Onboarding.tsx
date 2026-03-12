import { useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, ChevronLeft, Check, Loader2 } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import logoPath from "@assets/preppa_logo_orange_1_1773037358063.png";

// ─── Types ─────────────────────────────────────────────────────────────────
interface Answers {
  diets: string[];
  allergies: string[];
  adultCount: number;
  kidCount: number;
  groceryDay: string;
  cookingNights: number;
  dislikes: string;
  groceryStore: string;
  favoriteMeals: [string, string, string];
  pantryStaples: string[];
  freezerItems: string[];
}

const DEFAULT: Answers = {
  diets: [],
  allergies: [],
  adultCount: 2,
  kidCount: 0,
  groceryDay: "",
  cookingNights: 5,
  dislikes: "",
  groceryStore: "",
  favoriteMeals: ["", "", ""],
  pantryStaples: [],
  freezerItems: [],
};

// ─── Option lists ───────────────────────────────────────────────────────────
const DIET_OPTIONS = ["None / No restrictions", "Vegetarian", "Vegan", "Gluten-Free", "Dairy-Free", "Halal", "Kosher", "Keto", "Paleo"];
const ALLERGY_OPTIONS = ["None", "Tree Nuts", "Peanuts", "Dairy", "Eggs", "Shellfish", "Fish", "Wheat/Gluten", "Soy", "Sesame"];
const SHOPPING_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday", "No set day"];
const STORE_OPTIONS = ["Walmart", "Target", "Kroger / King Soopers", "Costco", "Whole Foods", "Trader Joe's", "Aldi", "Amazon Fresh / Instacart", "Local / Other"];
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

// ─── Reusable inputs ────────────────────────────────────────────────────────
function ChipMulti({ options, value, onChange }: { options: string[]; value: string[]; onChange: (v: string[]) => void }) {
  const toggle = (opt: string) =>
    onChange(value.includes(opt) ? value.filter(x => x !== opt) : [...value, opt]);
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(opt => {
        const on = value.includes(opt);
        return (
          <motion.button
            key={opt}
            type="button"
            whileTap={{ scale: 0.95 }}
            onClick={() => toggle(opt)}
            data-testid={`chip-${opt.toLowerCase().replace(/\s+/g, "-")}`}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-sm font-medium transition-colors ${
              on
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background border-border text-foreground hover:border-primary/50"
            }`}
          >
            {on && <Check size={12} strokeWidth={3} />}
            {opt}
          </motion.button>
        );
      })}
    </div>
  );
}

function ChipSingle({ options, value, onChange }: { options: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(opt => {
        const on = value === opt;
        return (
          <motion.button
            key={opt}
            type="button"
            whileTap={{ scale: 0.95 }}
            onClick={() => onChange(on ? "" : opt)}
            data-testid={`chip-${opt.toLowerCase().replace(/\s+/g, "-")}`}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-sm font-medium transition-colors ${
              on
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background border-border text-foreground hover:border-primary/50"
            }`}
          >
            {on && <Check size={12} strokeWidth={3} />}
            {opt}
          </motion.button>
        );
      })}
    </div>
  );
}

function Stepper({ value, onChange, min = 0, max = 10 }: { value: number; onChange: (v: number) => void; min?: number; max?: number }) {
  return (
    <div className="flex items-center gap-5">
      <motion.button
        type="button"
        whileTap={{ scale: 0.9 }}
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        className="w-11 h-11 rounded-2xl border border-border bg-background flex items-center justify-center text-xl font-bold disabled:opacity-30 hover:border-primary/50 transition-colors"
        data-testid="button-stepper-minus"
      >
        −
      </motion.button>
      <motion.span
        key={value}
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="text-4xl font-bold font-display w-14 text-center"
      >
        {value}
      </motion.span>
      <motion.button
        type="button"
        whileTap={{ scale: 0.9 }}
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        className="w-11 h-11 rounded-2xl border border-border bg-background flex items-center justify-center text-xl font-bold disabled:opacity-30 hover:border-primary/50 transition-colors"
        data-testid="button-stepper-plus"
      >
        +
      </motion.button>
    </div>
  );
}

// ─── Step definitions ───────────────────────────────────────────────────────
const STEPS = [
  {
    id: "diets",
    title: "Does anyone in your household follow a specific diet?",
    hint: "Select all that apply — we'll keep every meal in range.",
  },
  {
    id: "allergies",
    title: "Any food allergies we should avoid?",
    hint: "We take this seriously. Pick everything that applies.",
  },
  {
    id: "adults",
    title: "How many adults are in your household?",
    hint: "This helps us size recipes and grocery quantities.",
  },
  {
    id: "kids",
    title: "And how many kids?",
    hint: "We'll keep meals approachable for the whole family.",
  },
  {
    id: "groceryDay",
    title: "What day do you usually shop for groceries?",
    hint: "We'll time your meal plan around your shopping trip.",
  },
  {
    id: "cookingNights",
    title: "How many nights a week do you plan to cook?",
    hint: "No pressure — even 3 nights is great.",
  },
  {
    id: "dislikes",
    title: "Any foods your household dislikes or avoids?",
    hint: "Think ingredients or dishes — we'll keep them off the menu.",
  },
  {
    id: "groceryStore",
    title: "Where do you usually grocery shop?",
    hint: "We'll format quantities to match how that store sells items.",
  },
  {
    id: "favorites",
    title: "What are 3 dinners your family already loves?",
    hint: "Start with the easy wins — we'll build from there.",
  },
  {
    id: "pantry",
    title: "Which pantry staples do you usually keep stocked?",
    hint: "Anything you check here won't show up on your grocery list.",
  },
  {
    id: "freezer",
    title: "What do you usually have in your freezer?",
    hint: "Great for quick meal ideas and skipping store trips.",
  },
];

// ─── Main component ─────────────────────────────────────────────────────────
export default function Onboarding() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1); // 1 = forward, -1 = backward
  const [answers, setAnswers] = useState<Answers>(DEFAULT);

  const total = STEPS.length;
  const progress = ((step + 1) / total) * 100;

  const set = <K extends keyof Answers>(key: K, val: Answers[K]) =>
    setAnswers(prev => ({ ...prev, [key]: val }));

  const saveMutation = useMutation({
    mutationFn: async () => {
      const body = {
        diets: answers.diets,
        allergies: answers.allergies,
        adultCount: answers.adultCount,
        kidCount: answers.kidCount,
        groceryDay: answers.groceryDay || undefined,
        cookingNights: answers.cookingNights,
        dislikes: answers.dislikes || undefined,
        groceryStore: answers.groceryStore || undefined,
        favoriteMeals: answers.favoriteMeals.filter(Boolean),
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
      navigate("/");
    },
    onError: () => {
      toast({ title: "Something went wrong", description: "Please try again.", variant: "destructive" });
    },
  });

  const goNext = () => {
    if (step < total - 1) {
      setDirection(1);
      setStep(s => s + 1);
    } else {
      saveMutation.mutate();
    }
  };

  const goBack = () => {
    if (step > 0) {
      setDirection(-1);
      setStep(s => s - 1);
    }
  };

  const canContinue = () => {
    switch (STEPS[step].id) {
      case "groceryDay": return answers.groceryDay !== "";
      case "groceryStore": return answers.groceryStore !== "";
      default: return true;
    }
  };

  const variants = {
    enter: (dir: number) => ({ x: dir > 0 ? 40 : -40, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? -40 : 40, opacity: 0 }),
  };

  const currentStep = STEPS[step];

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <img src={logoPath} alt="Preppa" className="h-9" />
        </div>

        {/* Card */}
        <div className="bg-card rounded-3xl border border-border/40 shadow-xl overflow-hidden">
          {/* Progress bar */}
          <div className="h-1.5 bg-muted">
            <motion.div
              className="h-full bg-primary rounded-full"
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            />
          </div>

          {/* Step counter */}
          <div className="flex justify-between items-center px-6 pt-5 pb-1">
            <span className="text-xs font-medium text-muted-foreground">
              {step + 1} of {total}
            </span>
            <button
              onClick={() => saveMutation.mutate()}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              data-testid="button-skip-onboarding"
            >
              Skip for now
            </button>
          </div>

          {/* Step content */}
          <div className="px-6 pb-6 min-h-[340px] flex flex-col">
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={step}
                custom={direction}
                variants={variants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.28, ease: "easeOut" }}
                className="flex-1 flex flex-col"
              >
                <div className="mb-6 mt-2">
                  <h2 className="text-xl font-bold leading-snug mb-1">{currentStep.title}</h2>
                  <p className="text-sm text-muted-foreground">{currentStep.hint}</p>
                </div>

                {/* Inputs per step */}
                <div className="flex-1">
                  {currentStep.id === "diets" && (
                    <ChipMulti options={DIET_OPTIONS} value={answers.diets} onChange={v => set("diets", v)} />
                  )}

                  {currentStep.id === "allergies" && (
                    <ChipMulti options={ALLERGY_OPTIONS} value={answers.allergies} onChange={v => set("allergies", v)} />
                  )}

                  {currentStep.id === "adults" && (
                    <Stepper value={answers.adultCount} onChange={v => set("adultCount", v)} min={1} max={10} />
                  )}

                  {currentStep.id === "kids" && (
                    <Stepper value={answers.kidCount} onChange={v => set("kidCount", v)} min={0} max={10} />
                  )}

                  {currentStep.id === "groceryDay" && (
                    <ChipSingle options={SHOPPING_DAYS} value={answers.groceryDay} onChange={v => set("groceryDay", v)} />
                  )}

                  {currentStep.id === "cookingNights" && (
                    <Stepper value={answers.cookingNights} onChange={v => set("cookingNights", v)} min={1} max={7} />
                  )}

                  {currentStep.id === "dislikes" && (
                    <textarea
                      value={answers.dislikes}
                      onChange={e => set("dislikes", e.target.value)}
                      placeholder="e.g. cilantro, mushrooms, spicy food, anchovies…"
                      rows={3}
                      data-testid="input-dislikes"
                      className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                    />
                  )}

                  {currentStep.id === "groceryStore" && (
                    <ChipSingle options={STORE_OPTIONS} value={answers.groceryStore} onChange={v => set("groceryStore", v)} />
                  )}

                  {currentStep.id === "favorites" && (
                    <div className="space-y-3">
                      {([0, 1, 2] as const).map(i => (
                        <input
                          key={i}
                          type="text"
                          value={answers.favoriteMeals[i]}
                          onChange={e => {
                            const next: [string, string, string] = [...answers.favoriteMeals] as [string, string, string];
                            next[i] = e.target.value;
                            set("favoriteMeals", next);
                          }}
                          placeholder={["e.g. Spaghetti Bolognese", "e.g. Sheet Pan Chicken", "e.g. Taco Tuesday"][i]}
                          data-testid={`input-favorite-${i + 1}`}
                          className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                        />
                      ))}
                    </div>
                  )}

                  {currentStep.id === "pantry" && (
                    <div className="space-y-4 max-h-52 overflow-y-auto pr-1">
                      {PANTRY_GROUPS.map(group => (
                        <div key={group.label}>
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                            {group.label}
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {group.items.map(item => {
                              const on = answers.pantryStaples.includes(item);
                              return (
                                <motion.button
                                  key={item}
                                  type="button"
                                  whileTap={{ scale: 0.95 }}
                                  onClick={() =>
                                    set("pantryStaples", on
                                      ? answers.pantryStaples.filter(x => x !== item)
                                      : [...answers.pantryStaples, item])
                                  }
                                  data-testid={`chip-pantry-${item.toLowerCase().replace(/\s+/g, "-")}`}
                                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-sm font-medium transition-colors ${
                                    on
                                      ? "bg-primary text-primary-foreground border-primary"
                                      : "bg-background border-border text-foreground hover:border-primary/50"
                                  }`}
                                >
                                  {on && <Check size={12} strokeWidth={3} />}
                                  {item}
                                </motion.button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {currentStep.id === "freezer" && (
                    <ChipMulti options={FREEZER_OPTIONS} value={answers.freezerItems} onChange={v => set("freezerItems", v)} />
                  )}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Footer nav */}
          <div className="px-6 pb-6 flex items-center gap-3">
            {step > 0 && (
              <motion.button
                type="button"
                whileTap={{ scale: 0.96 }}
                onClick={goBack}
                data-testid="button-onboarding-back"
                className="flex items-center gap-1.5 px-4 py-3 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
              >
                <ChevronLeft size={16} />
                Back
              </motion.button>
            )}
            <motion.button
              type="button"
              whileTap={{ scale: 0.97 }}
              onClick={goNext}
              disabled={!canContinue() || saveMutation.isPending}
              data-testid="button-onboarding-next"
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-foreground text-background rounded-xl font-semibold text-sm hover:bg-foreground/90 transition-all disabled:opacity-40"
            >
              {saveMutation.isPending ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <>
                  {step === total - 1 ? "Let's go! →" : "Continue"}
                  {step < total - 1 && <ChevronRight size={16} />}
                </>
              )}
            </motion.button>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { MealPlanView } from "@/components/MealPlanView";
import { GroceryListView } from "@/components/GroceryListView";
import { PantrySetupModal } from "@/components/PantrySetupModal";
import { motion } from "framer-motion";
import { usePantry } from "@/hooks/use-pantry";
import { useCurrentMealPlan } from "@/hooks/use-meal-plans";

const PANTRY_SETUP_KEY = "preppa_pantry_setup_done";

export default function Dashboard() {
  const { data: pantryItems } = usePantry();
  const { data: plan } = useCurrentMealPlan();
  const [showPantrySetup, setShowPantrySetup] = useState(false);

  useEffect(() => {
    const alreadyDone = localStorage.getItem(PANTRY_SETUP_KEY) === "true";
    if (alreadyDone) return;
    if (plan && pantryItems && pantryItems.length === 0) {
      setShowPantrySetup(true);
    }
  }, [plan, pantryItems]);

  const handlePantryClose = () => {
    localStorage.setItem(PANTRY_SETUP_KEY, "true");
    setShowPantrySetup(false);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col pb-12">
      <Navbar />

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 mt-8">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8"
        >
          <div className="lg:col-span-7 min-h-[500px]">
            <MealPlanView />
          </div>

          <div className="lg:col-span-5 min-h-[400px]">
            <GroceryListView />
          </div>
        </motion.div>
      </main>

      {showPantrySetup && <PantrySetupModal onClose={handlePantryClose} />}
    </div>
  );
}

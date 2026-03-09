import { Navbar } from "@/components/Navbar";
import { MealPlanView } from "@/components/MealPlanView";
import { GroceryListView } from "@/components/GroceryListView";
import { motion } from "framer-motion";

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-background flex flex-col pb-12">
      <Navbar />

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 mt-8">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8"
        >
          {/* Left Column: Meal Plan */}
          <div className="lg:col-span-7 min-h-[500px]">
            <MealPlanView />
          </div>

          {/* Right Column: Grocery List */}
          <div className="lg:col-span-5 min-h-[400px]">
            <GroceryListView />
          </div>
        </motion.div>
      </main>
    </div>
  );
}

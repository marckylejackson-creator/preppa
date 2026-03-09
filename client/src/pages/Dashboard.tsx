import { Navbar } from "@/components/Navbar";
import { PantryManager } from "@/components/PantryManager";
import { MealManager } from "@/components/MealManager";
import { MealPlanView } from "@/components/MealPlanView";
import { GroceryListView } from "@/components/GroceryListView";
import { motion } from "framer-motion";

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-background flex flex-col pb-12">
      <Navbar />
      
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 mt-8">
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 h-full"
        >
          {/* Left Column: Data Input */}
          <div className="lg:col-span-4 flex flex-col gap-6 lg:gap-8 h-full">
            <div className="shrink-0">
              <PantryManager />
            </div>
            <div className="flex-1 min-h-[400px]">
              <MealManager />
            </div>
          </div>

          {/* Middle Column: The Plan */}
          <div className="lg:col-span-5 min-h-[500px]">
            <MealPlanView />
          </div>

          {/* Right Column: Execution */}
          <div className="lg:col-span-3 min-h-[400px]">
            <GroceryListView />
          </div>
        </motion.div>
      </main>
    </div>
  );
}

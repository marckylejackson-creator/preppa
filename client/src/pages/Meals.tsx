import { Navbar } from "@/components/Navbar";
import { MealManager } from "@/components/MealManager";
import { FavoritesManager } from "@/components/FavoritesManager";
import { motion } from "framer-motion";

export default function Meals() {
  return (
    <div className="min-h-screen bg-background flex flex-col pb-12">
      <Navbar />
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 mt-8">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-6"
        >
          <FavoritesManager />
          <MealManager />
        </motion.div>
      </main>
    </div>
  );
}

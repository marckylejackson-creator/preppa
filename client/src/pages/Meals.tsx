import { Navbar } from "@/components/Navbar";
import { MealsPanel } from "@/components/MealsPanel";
import { motion } from "framer-motion";

export default function Meals() {
  return (
    <div className="min-h-screen bg-background flex flex-col pb-12">
      <Navbar />
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 sm:px-6 lg:px-8 mt-8">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <MealsPanel />
        </motion.div>
      </main>
    </div>
  );
}

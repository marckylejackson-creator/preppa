import { LogIn, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

export default function Landing() {
  return (
    <div className="min-h-screen flex flex-col bg-background relative overflow-hidden">
      {/* Decorative background blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-3xl" />
      <div className="absolute bottom-[-10%] right-[-5%] w-[50%] h-[50%] bg-accent/40 rounded-full blur-3xl" />

      <nav className="w-full px-6 py-6 flex justify-between items-center relative z-10">
        <div className="font-display font-bold text-2xl tracking-tight text-foreground">
          Preppa
        </div>
        <button
          onClick={() => window.location.href = "/api/login"}
          className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-xl bg-white border border-border/50 hover:bg-secondary transition-all shadow-sm"
        >
          <LogIn size={16} />
          <span>Sign In</span>
        </button>
      </nav>

      <main className="flex-1 flex items-center justify-center relative z-10 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <span className="inline-block py-1.5 px-4 rounded-full bg-primary/10 text-primary font-semibold text-sm mb-6 border border-primary/20">
              For working parents
            </span>
            <h1 className="text-5xl md:text-7xl font-display font-extrabold tracking-tight leading-[1.1] mb-8 text-foreground">
              Dinner planning, <br/>
              <span className="text-primary">solved in 60 seconds.</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed mb-10">
              Preppa reduces the mental load of weeknight dinner by auto-generating a family-acceptable, time-realistic meal plan and consolidated grocery list.
            </p>

            <button
              onClick={() => window.location.href = "/api/login"}
              className="group inline-flex items-center gap-2 px-8 py-4 text-lg font-bold rounded-2xl bg-foreground text-background hover:bg-foreground/90 transition-all active:scale-95 shadow-xl shadow-foreground/10"
            >
              Start Planning
              <ArrowRight className="group-hover:translate-x-1 transition-transform" size={20} />
            </button>
          </motion.div>
        </div>
      </main>
      
      {/* landing page hero food background suggestion */}
      {/* <img src="https://images.unsplash.com/photo-1498837167922-41c46b66c068?w=1920&q=80" alt="Cooking background" /> */}
    </div>
  );
}

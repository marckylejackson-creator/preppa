import { LogIn, ArrowRight, Wand2, ShoppingCart, History } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "wouter";
import logoSrc from "@assets/preppa_logo_orange_1_1773037358063.png";

export default function Landing() {
  return (
    <div className="min-h-screen flex flex-col bg-background relative overflow-hidden">
      {/* Decorative background blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-3xl" />
      <div className="absolute bottom-[-10%] right-[-5%] w-[50%] h-[50%] bg-accent/40 rounded-full blur-3xl" />

      <nav className="w-full px-6 py-6 flex justify-between items-center relative z-10">
        <img src={logoSrc} alt="Preppa" className="h-9 w-auto" />
        <button
          onClick={() => window.location.href = "/api/login"}
          data-testid="button-landing-signin"
          className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-xl bg-white border border-border/50 hover:bg-secondary transition-all shadow-sm"
        >
          <LogIn size={16} />
          <span>Sign In</span>
        </button>
      </nav>

      <main className="flex-1 flex items-center justify-center relative z-10 px-4 py-12">
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
              Preppa auto-generates a family-friendly 5-day meal plan and a consolidated, store-ready grocery list — so you stop dreading the "what's for dinner?" question.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={() => window.location.href = "/api/login"}
                data-testid="button-landing-start"
                className="group inline-flex items-center gap-2 px-8 py-4 text-lg font-bold rounded-2xl bg-foreground text-background hover:bg-foreground/90 transition-all active:scale-95 shadow-xl shadow-foreground/10 w-full sm:w-auto justify-center"
              >
                Start Planning Free
                <ArrowRight className="group-hover:translate-x-1 transition-transform" size={20} />
              </button>
              <Link
                href="/try"
                data-testid="link-try-guest"
                className="group inline-flex items-center gap-2 px-8 py-4 text-lg font-semibold rounded-2xl border border-border/60 bg-white hover:bg-secondary transition-all active:scale-95 w-full sm:w-auto justify-center text-foreground"
              >
                Try without signing up
              </Link>
            </div>
          </motion.div>

          {/* Feature highlights */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-20 grid grid-cols-1 sm:grid-cols-3 gap-6 text-left"
          >
            {[
              {
                icon: Wand2,
                title: "AI-powered plans",
                desc: "Picks meals your family already likes based on your history, avoids repeats, and considers what you bought last week."
              },
              {
                icon: ShoppingCart,
                title: "Store-ready grocery list",
                desc: "Every item formatted as you'd buy it — '2 lbs ground beef', '1 head broccoli' — with pantry staples separated."
              },
              {
                icon: History,
                title: "Weekly history",
                desc: "See what you ate and when you shopped each week. The AI learns from your history to keep variety fresh."
              },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="p-6 bg-card rounded-3xl border border-border/40 shadow-sm">
                <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center mb-4 text-primary">
                  <Icon size={20} />
                </div>
                <h3 className="font-display font-bold text-lg mb-2">{title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </main>
    </div>
  );
}

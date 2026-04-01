import { motion } from "framer-motion";
import { Sun, Moon } from "lucide-react";
import { useLocation } from "react-router-dom";
import { useTheme } from "../../context/ThemeContext";

/**
 * ThemeToggle
 * A premium floating sidebar control for switching between Light and Gold themes.
 */
export default function ThemeToggle() {
  const { isDark, toggleTheme } = useTheme();
  const location = useLocation();

  if (location.pathname.startsWith("/doctor") || location.pathname.startsWith("/admin")) {
    return null;
  }

  return (
    <motion.div
      className="fixed right-6 top-1/2 -translate-y-1/2 z-[10000]"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 2, duration: 1 }}
    >
      <div className="flex flex-col items-center gap-4">
        <span className="[writing-mode:vertical-rl] text-[0.6rem] font-black uppercase tracking-[0.4em] text-slate-400 dark:text-gold-soft opacity-60">
          Theme Select
        </span>
        
        <motion.button
          onClick={(e) => toggleTheme(e)}
          whileHover={{ scale: 1.1, rotate: 5 }}
          whileTap={{ scale: 0.9 }}
          className={`
            p-4 rounded-full border shadow-xl backdrop-blur-2xl transition-all duration-700
            ${isDark 
              ? "bg-[var(--bg-secondary)]/60 border-[var(--cyan-primary)]/40 text-[var(--gold-primary)] shadow-[0_0_20px_rgba(6,182,212,0.2)]" 
              : "bg-white/60 border-white/80 text-slate-800 shadow-xl"}
          `}
        >
          {isDark ? (
            <Sun size={20} strokeWidth={2.5} />
          ) : (
            <Moon size={20} strokeWidth={2.5} />
          )}
          
          {/* Subtle Glow Ring */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-white/0 via-white/20 to-white/0 pointer-events-none" />
        </motion.button>
      </div>
    </motion.div>
  );
}

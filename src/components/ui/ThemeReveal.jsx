import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "../../context/ThemeContext";

/**
 * ThemeReveal
 * A high-fidelity transition layer that simulates a 'Liquid Drop' expansion
 * when switching themes.
 */
export default function ThemeReveal() {
  const { isDark, isTransitioning, revealOrigin } = useTheme();

  return (
    <AnimatePresence>
      {isTransitioning && (
        <motion.div
          key={isDark ? "to-dark" : "to-light"}
          initial={{ 
            clipPath: `circle(0% at ${revealOrigin.x}px ${revealOrigin.y}px)`,
          }}
          animate={{ 
            clipPath: `circle(150% at ${revealOrigin.x}px ${revealOrigin.y}px)`,
          }}
          exit={{ opacity: 0 }}
          transition={{ 
            duration: 1.2, 
            ease: [0.22, 1, 0.36, 1], // Apple-inspired smooth easing
          }}
          className="fixed inset-0 z-[9999] pointer-events-none transition-colors duration-300 bg-[var(--bg-primary)]"
        >
          {/* Subtle turbulence / liquid distortion effect during reveal */}
          <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.4)_100%)]" />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

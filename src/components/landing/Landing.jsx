import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useTheme } from "../../context/ThemeContext";
import GlassSurface from "../ui/GlassSurface";
import LiquidEther from "../ui/LiquidEther";
import RefractionFilter from "../ui/RefractionFilter";
import AmbientBackdrop from "../ui/AmbientBackdrop";
import useAdaptiveVisuals from "../../hooks/useAdaptiveVisuals";

function GlassButton({ onClick, children, primary = false, className = "" }) {
  const { isDark } = useTheme();

  return (
    <motion.button
      whileHover={{ scale: 1.04 }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className={`
        relative overflow-hidden rounded-2xl px-10 py-4 font-bold text-sm tracking-wide
        transition-all duration-300
        backdrop-blur-xl backdrop-saturate-150
        border border-white/40 dark:border-[var(--gold-primary)]/20
        shadow-[0_4px_32px_rgba(255,255,255,0.25),inset_0_1px_0_rgba(255,255,255,0.6)]
        dark:shadow-[0_4px_32px_rgba(212,175,55,0.1),inset_0_1px_0_rgba(212,175,55,0.2)]
        bg-white/20 dark:bg-white/5 text-[var(--text-primary)]
        hover:bg-white/30 dark:hover:bg-white/10 hover:border-white/60 dark:hover:border-[var(--gold-primary)]/40
        ${primary ? "!bg-white/40 dark:!bg-[var(--gold-primary)]/20 !border-white/60 dark:!border-[var(--gold-primary)]/50 !text-[var(--text-primary)]" : ""}
        ${className}
      `}
    >
      <div
        className={`absolute inset-0 rounded-2xl bg-gradient-to-b ${isDark ? "from-[var(--gold-soft)]/10" : "from-white/30"} via-transparent to-transparent pointer-events-none`}
      />
      <span className="relative z-10 flex items-center gap-2">{children}</span>
    </motion.button>
  );
}

function GlassText({ children, className = "" }) {
  const { isDark } = useTheme();

  return (
    <div
      className={`
        relative rounded-3xl
        backdrop-blur-2xl backdrop-saturate-200
        bg-white/15 dark:bg-white/5
        border border-white/40 dark:border-[var(--gold-primary)]/20
        shadow-[0_4px_24px_rgba(255,255,255,0.2),inset_0_1px_0_rgba(255,255,255,0.5)]
        dark:shadow-[0_4px_24px_rgba(212,175,55,0.1),inset_0_1px_0_rgba(212,175,55,0.2)]
        ${className}
      `}
    >
      <div
        className={`absolute inset-0 rounded-3xl bg-gradient-to-b ${isDark ? "from-[var(--gold-soft)]/10" : "from-white/20"} via-white/5 to-transparent pointer-events-none`}
      />
      <div className="relative z-10">{children}</div>
    </div>
  );
}

const ease = [0.22, 1, 0.36, 1];

export default function Landing() {
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const { allowFluid } = useAdaptiveVisuals();

  const handleEnter = () => {
    navigate("/login");
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.3, duration: 1.0, ease },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 40, filter: "blur(12px)" },
    visible: {
      opacity: 1,
      y: 0,
      filter: "blur(0px)",
      transition: { duration: 1.4, ease },
    },
  };

  const etherColors = isDark
    ? ["#aa771c", "#d4af37", "#f3e5ab", "#bf953f"]
    : ["#bfdbfe", "#ddd6fe", "#fbcfe8", "#ffffff"];

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[var(--bg-primary)] text-[var(--text-primary)] font-sans transition-colors duration-700">
      <RefractionFilter />

      <div className="fixed inset-0 z-0 pointer-events-none select-none">
        {allowFluid ? (
          <LiquidEther
            colors={etherColors}
            mouseForce={28}
            cursorSize={180}
            isViscous
            viscous={32}
            iterationsViscous={40}
            iterationsPoisson={40}
            resolution={0.5}
            isBounce={false}
            autoDemo
            autoSpeed={0.8}
            autoIntensity={3.2}
            takeoverDuration={0.4}
            autoResumeDelay={2500}
            autoRampDuration={1.2}
            className={`h-full w-full ${isDark ? "mix-blend-screen opacity-90" : "mix-blend-multiply opacity-80"}`}
          />
        ) : (
          <AmbientBackdrop
            palette={etherColors}
            opacity={isDark ? 0.9 : 0.75}
            className={isDark ? "mix-blend-screen" : "mix-blend-multiply"}
          />
        )}
      </div>

      <div
        className="fixed inset-0 z-[1] pointer-events-none transition-colors duration-1000"
        style={{ background: "radial-gradient(ellipse at center, transparent 30%, var(--vignette-color) 100%)" }}
      />

      <div className="relative z-10 flex min-h-screen flex-col">
        <header className="fixed top-0 left-0 right-0 z-50 px-6 py-6">
          <div className="mx-auto max-w-7xl">
            <GlassSurface
              width="100%"
              height="68px"
              borderRadius={34}
              backgroundOpacity={isDark ? 0.4 : 0.15}
              blur={28}
              brightness={isDark ? 90 : 110}
              saturation={2.5}
              className={`px-8 border transition-all duration-700 ${isDark ? "border-[var(--cyan-primary)]/20 shadow-[0_4px_30px_rgba(6,182,212,0.1),inset_0_1px_0_rgba(6,182,212,0.2)]" : "border-white/50 shadow-[0_4px_30px_rgba(255,255,255,0.3),inset_0_1px_0_rgba(255,255,255,0.7)]"}`}
            >
              <div className="flex w-full items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`h-7 w-7 rounded-full bg-gradient-to-tr ${isDark ? "from-[var(--gold-primary)] via-amber-200 to-[var(--gold-soft)] shadow-[0_0_20px_var(--gold-primary)]" : "from-blue-400 via-violet-400 to-rose-400 shadow-[0_0_16px_rgba(30,58,138,0.2)]"}`} />
                  <span className={`text-xl font-black tracking-tight ${isDark ? "text-transparent bg-clip-text bg-[var(--gold-metallic)]" : "text-slate-800"}`}>
                    DoctorCopilot
                  </span>
                </div>

                <nav className="hidden md:flex items-center gap-3">
                  <GlassButton
                    onClick={handleEnter}
                    primary
                    className={`px-6 py-2 !rounded-full text-xs ${isDark ? "shadow-[0_0_20px_rgba(6,182,212,0.2)]" : ""}`}
                  >
                    Enter System
                  </GlassButton>
                </nav>

                <button className="md:hidden p-2 rounded-xl text-slate-500 hover:text-slate-800 bg-white/20 border border-white/40 backdrop-blur-md">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                  </svg>
                </button>
              </div>
            </GlassSurface>
          </div>
        </header>

        <main className="flex flex-1 flex-col items-center justify-center px-6 pt-40 pb-20">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="w-full max-w-5xl flex flex-col items-center text-center gap-8"
          >
            <motion.div variants={itemVariants}>
              <GlassText className={`px-6 py-2 !rounded-full inline-flex items-center gap-2.5 transition-all duration-700 ${isDark ? "border-[var(--cyan-primary)]/30 shadow-[0_0_15px_rgba(6,182,212,0.15)]" : ""}`}>
                <div className={`h-1.5 w-1.5 rounded-full animate-pulse transition-colors duration-700 ${isDark ? "bg-[var(--cyan-primary)] shadow-[0_0_8px_var(--cyan-primary)]" : "bg-violet-400"}`} />
                <span className={`text-[0.7rem] font-black uppercase tracking-[0.3em] transition-colors duration-700 ${isDark ? "text-[var(--cyan-primary)]" : "text-violet-700"}`}>
                  Precision Medical AI
                </span>
              </GlassText>
            </motion.div>

            <motion.div variants={itemVariants} className="w-full">
              <GlassText className="px-10 py-12 md:px-20 md:py-16 !rounded-[40px] border-white/60 dark:border-[var(--gold-primary)]/20 relative overflow-hidden group">
                <div className={`scanner-line opacity-0 group-hover:opacity-100 transition-opacity duration-1000 ${isDark ? "!background-[var(--gold-primary)] !box-shadow-[0_0_15px_var(--gold-primary)]" : ""}`} />
                <div className={`corner-bracket corner-tl ${isDark ? "!border-[var(--cyan-primary)]/40 shadow-[0_0_5px_var(--cyan-primary)]" : ""}`} />
                <div className={`corner-bracket corner-tr ${isDark ? "!border-[var(--cyan-primary)]/40 shadow-[0_0_5px_var(--cyan-primary)]" : ""}`} />
                <div className={`corner-bracket corner-bl ${isDark ? "!border-[var(--cyan-primary)]/40 shadow-[0_0_5px_var(--cyan-primary)]" : ""}`} />
                <div className={`corner-bracket corner-br ${isDark ? "!border-[var(--cyan-primary)]/40 shadow-[0_0_5px_var(--cyan-primary)]" : ""}`} />

                <div className={`absolute top-4 left-10 system-text-precise opacity-70 transition-colors duration-700 ${isDark ? "text-[var(--cyan-primary)] drop-shadow-[0_0_8px_rgba(6,182,212,0.4)]" : "text-[var(--text-secondary)]"}`}>
                  Diagnostic Source: {isDark ? "GEN-CYAN-X1" : "Neural-V4"}
                </div>
                <div className={`absolute bottom-4 right-10 system-text-precise opacity-70 transition-colors duration-700 ${isDark ? "text-[var(--cyan-primary)] drop-shadow-[0_0_8px_rgba(6,182,212,0.4)]" : "text-[var(--text-secondary)]"}`}>
                  System Integrity: {isDark ? "99.9% GOLD" : "98.4%"}
                </div>

                <h1 className="relative z-10 text-[clamp(2.5rem,7.5vw,5.5rem)] font-black tracking-[-0.03em] leading-[1.05] text-[var(--text-primary)]">
                  <span className="block mb-2 uppercase tracking-tight">Understand Your Health.</span>
                  <span
                    className={`text-transparent bg-clip-text font-extrabold tracking-[-0.01em] transition-all duration-1000 ${isDark ? "drop-shadow-[0_0_20px_rgba(255,215,0,0.6)]" : ""}`}
                    style={{
                      backgroundImage: isDark
                        ? "linear-gradient(135deg, #f3e5ab, #ffd700 50%, #f3e5ab)"
                        : "linear-gradient(to right, #2563eb, #4f46e5, #7c3aed)",
                    }}
                  >
                    Not Just Your Reports.
                  </span>
                </h1>

                <div className="mt-8 flex items-center justify-center gap-1.5 opacity-20">
                  {[...Array(12)].map((_, i) => (
                    <div key={i} className={`h-1 rounded-full bg-slate-900 ${i % 4 === 0 ? "w-4" : "w-1.5"}`} />
                  ))}
                </div>
              </GlassText>
            </motion.div>

            <motion.div variants={itemVariants} className="w-full max-w-3xl">
              <GlassText className="px-10 py-7 !rounded-3xl">
                <p className={`text-lg md:text-xl leading-[1.65] font-medium tracking-tight transition-colors duration-700 ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                  DoctorCopilot transforms complex medical reports into beautiful,
                  <br className="hidden md:block" />
                  actionable health intelligence for patients and clinicians alike.
                </p>
              </GlassText>
            </motion.div>

            <motion.div variants={itemVariants} className="flex flex-col sm:flex-row items-center gap-5 pt-4">
              <GlassButton onClick={handleEnter} primary className="px-14 py-5 !rounded-2xl text-base !tracking-wide">
                Start System
                <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </GlassButton>
            </motion.div>
          </motion.div>
        </main>

        <footer className="mt-auto px-12 py-12">
          <GlassText className="px-10 py-6 !rounded-2xl">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <span className={`text-[0.65rem] font-black uppercase tracking-[0.4em] transition-colors duration-700 ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                DoctorCopilot © 2026 · <span className={isDark ? "text-[var(--gold-primary)] opacity-60" : ""}>Futuristic Clinical Intelligence</span>
              </span>
              <div className="flex gap-8">
                {["Terms", "Privacy", "Support"].map((item) => (
                  <a
                    key={item}
                    href="#"
                    className={`text-[0.65rem] font-black uppercase tracking-widest transition-colors ${isDark ? "text-slate-500 hover:text-[var(--cyan-primary)]" : "text-slate-400 hover:text-slate-700"}`}
                  >
                    {item}
                  </a>
                ))}
              </div>
            </div>
          </GlassText>
        </footer>
      </div>
    </div>
  );
}

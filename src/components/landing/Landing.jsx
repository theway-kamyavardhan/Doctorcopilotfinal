import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Download, Monitor, Smartphone, Apple, Share, Plus, X, ChevronRight } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";
import usePWA from "../../hooks/usePWA";
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

// ─── Native Mobile Port (Apple Health Style) ─────────────────────────────────

function MobileLanding({ onEnter, isDark }) {
  return (
    <div className={`flex flex-col min-h-[100svh] w-full font-sans antialiased ${isDark ? 'bg-black text-white' : 'bg-white text-black'}`}>
      <main className="flex-1 px-6 pt-24 pb-32 flex flex-col justify-center">
        <div className="h-16 w-16 mb-8 rounded-3xl bg-blue-500 text-white flex items-center justify-center">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
        </div>
        <h1 className="text-[44px] leading-[1.1] font-bold tracking-tight mb-4">
          Doctor<br/>Copilot
        </h1>
        <p className={`text-lg font-medium leading-snug ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
          A clinical workspace to track health history, manage cases, and extract intelligence from medical reports.
        </p>
      </main>

      <div className={`fixed bottom-0 w-full px-6 pb-[env(safe-area-inset-bottom,32px)] pt-4 backdrop-blur-2xl ${isDark ? 'bg-black/80' : 'bg-white/80'}`}>
        <button
          onClick={onEnter}
          style={{ touchAction: 'manipulation' }}
          className="w-full min-h-[56px] rounded-2xl bg-[#007AFF] text-white text-lg font-bold flex items-center justify-center active:scale-95 transition-transform"
        >
          Continue
        </button>
      </div>
    </div>
  );
}

// ─── Desktop Components ───────────────────────────────────────────────────────

// ─── iOS Add-to-Home-Screen guide (only shown on iOS) ───────────────────────
function IOSGuide({ isDark, onClose }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-end justify-center"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", stiffness: 380, damping: 38 }}
        onClick={(e) => e.stopPropagation()}
        className={`relative w-full max-w-md rounded-t-3xl border-t border-x p-6 pb-10 ${
          isDark ? "bg-[#111114] border-white/10" : "bg-white border-slate-200"
        } shadow-2xl`}
      >
        {/* drag handle */}
        <div className={`mx-auto mb-5 h-1 w-10 rounded-full ${isDark ? "bg-white/20" : "bg-slate-300"}`} />
        <button onClick={onClose} className={`absolute right-4 top-4 rounded-full p-1.5 ${isDark ? "text-slate-400 hover:bg-white/10" : "text-slate-400 hover:bg-slate-100"}`}><X size={18}/></button>

        <div className="flex items-center gap-3 mb-6">
          <div className={`rounded-2xl p-3 ${isDark ? "bg-blue-500/10 text-blue-300" : "bg-blue-50 text-blue-600"}`}>
            <Apple size={22}/>
          </div>
          <div>
            <div className={`font-black text-lg ${isDark ? "text-white" : "text-slate-900"}`}>Add to Home Screen</div>
            <div className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>iPhone &amp; iPad · Safari only</div>
          </div>
        </div>

        {/* Visual step-by-step */}
        <div className="space-y-3">
          {[
            { step: 1, icon: "🌐", text: "Open this page in Safari", sub: "Chrome/Firefox on iOS cannot install PWAs" },
            { step: 2, icon: "⬆️", text: "Tap the Share button", sub: "The □↑ icon at the bottom of Safari" },
            { step: 3, icon: "➕", text: "Tap 'Add to Home Screen'", sub: "Scroll down in the share sheet" },
            { step: 4, icon: "✅", text: "Tap 'Add'", sub: "App appears on your home screen instantly" },
          ].map(({ step, icon, text, sub }) => (
            <div key={step} className={`flex items-start gap-3 rounded-2xl p-3.5 ${
              isDark ? "bg-white/5" : "bg-slate-50"
            }`}>
              <span className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-black ${
                isDark ? "bg-blue-500/20 text-blue-300" : "bg-blue-100 text-blue-700"
              }`}>{step}</span>
              <div className="min-w-0">
                <div className={`text-sm font-bold ${isDark ? "text-white" : "text-slate-800"}`}>
                  <span className="mr-1.5">{icon}</span>{text}
                </div>
                <div className={`text-xs mt-0.5 ${isDark ? "text-slate-400" : "text-slate-500"}`}>{sub}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Animated arrow pointing down to where Safari share bar is */}
        <motion.div
          animate={{ y: [0, 6, 0] }}
          transition={{ repeat: Infinity, duration: 1.4 }}
          className={`mt-5 flex items-center justify-center gap-2 text-xs font-bold ${
            isDark ? "text-blue-400" : "text-blue-600"
          }`}
        >
          <span>Tap Share</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14M19 12l-7 7-7-7"/>
          </svg>
          <span>below ↓</span>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

// ─── Landing ──────────────────────────────────────────────────────────────────
export default function Landing() {
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const { allowFluid } = useAdaptiveVisuals();
  const { isInstallable, promptInstall, isIOS } = usePWA();

  const handleInstallClick = async () => {
    if (isIOS) {
      // iOS Safari: show the guide — Apple blocks programmatic install
      setShowIOSGuide(true);
      return;
    }
    if (isInstallable) {
      // Android Chrome / Desktop Chrome/Edge: fire native install prompt directly
      await promptInstall();
      return;
    }
    // Browser hasn't fired beforeinstallprompt yet (not eligible or already installed)
    // Open the page in a new tab which may trigger the prompt, or show nothing
    window.open(window.location.href, "_blank");
  };

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
      {allowFluid && <RefractionFilter />}

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
        <header className="fixed left-0 right-0 top-0 z-50 px-4 py-4 sm:px-6 sm:py-6">
          <div className="mx-auto max-w-7xl">
            <GlassSurface
              width="100%"
              height="auto"
              borderRadius={28}
              backgroundOpacity={isDark ? 0.4 : 0.15}
              blur={28}
              brightness={isDark ? 90 : 110}
              saturation={2.5}
              className={`border px-4 py-4 transition-all duration-700 sm:px-6 ${isDark ? "border-[var(--cyan-primary)]/20 shadow-[0_4px_30px_rgba(6,182,212,0.1),inset_0_1px_0_rgba(6,182,212,0.2)]" : "border-white/50 shadow-[0_4px_30px_rgba(255,255,255,0.3),inset_0_1px_0_rgba(255,255,255,0.7)]"}`}
            >
              <div className="flex w-full items-center justify-between gap-4">
                <div className="min-w-0 flex items-center gap-3">
                  <div className={`h-7 w-7 rounded-full bg-gradient-to-tr ${isDark ? "from-[var(--gold-primary)] via-amber-200 to-[var(--gold-soft)] shadow-[0_0_20px_var(--gold-primary)]" : "from-blue-400 via-violet-400 to-rose-400 shadow-[0_0_16px_rgba(30,58,138,0.2)]"}`} />
                  <span
                    className={`truncate text-lg font-black tracking-tight sm:text-xl ${isDark ? "text-[#f3e5ab]" : "text-slate-800"}`}
                  >
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

                <GlassButton
                  onClick={handleEnter}
                  primary
                  className={`px-4 py-2 !rounded-full text-[11px] sm:hidden ${isDark ? "shadow-[0_0_20px_rgba(6,182,212,0.2)]" : ""}`}
                >
                  Enter
                </GlassButton>
              </div>
            </GlassSurface>
          </div>
        </header>

        <main className="flex flex-1 flex-col items-center justify-center px-4 pb-16 pt-32 sm:px-6 sm:pb-20 sm:pt-40">
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
              <GlassText className="relative overflow-hidden !rounded-[32px] border-white/60 px-5 py-8 dark:border-[var(--gold-primary)]/20 group sm:px-8 sm:py-10 md:!rounded-[40px] md:px-20 md:py-16">
                <div className={`scanner-line opacity-0 group-hover:opacity-100 transition-opacity duration-1000 ${isDark ? "!background-[var(--gold-primary)] !box-shadow-[0_0_15px_var(--gold-primary)]" : ""}`} />
                <div className={`corner-bracket corner-tl ${isDark ? "!border-[var(--cyan-primary)]/40 shadow-[0_0_5px_var(--cyan-primary)]" : ""}`} />
                <div className={`corner-bracket corner-tr ${isDark ? "!border-[var(--cyan-primary)]/40 shadow-[0_0_5px_var(--cyan-primary)]" : ""}`} />
                <div className={`corner-bracket corner-bl ${isDark ? "!border-[var(--cyan-primary)]/40 shadow-[0_0_5px_var(--cyan-primary)]" : ""}`} />
                <div className={`corner-bracket corner-br ${isDark ? "!border-[var(--cyan-primary)]/40 shadow-[0_0_5px_var(--cyan-primary)]" : ""}`} />

                <div className={`absolute left-5 top-4 hidden system-text-precise opacity-70 transition-colors duration-700 sm:block md:left-10 ${isDark ? "text-[var(--cyan-primary)] drop-shadow-[0_0_8px_rgba(6,182,212,0.4)]" : "text-[var(--text-secondary)]"}`}>
                  Diagnostic Source: {isDark ? "GEN-CYAN-X1" : "Neural-V4"}
                </div>
                <div className={`absolute bottom-4 right-5 hidden system-text-precise opacity-70 transition-colors duration-700 sm:block md:right-10 ${isDark ? "text-[var(--cyan-primary)] drop-shadow-[0_0_8px_rgba(6,182,212,0.4)]" : "text-[var(--text-secondary)]"}`}>
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
              <GlassText className="!rounded-3xl px-5 py-6 sm:px-8 sm:py-7 md:px-10">
                <p className={`text-lg md:text-xl leading-[1.65] font-medium tracking-tight transition-colors duration-700 ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                  DoctorCopilot transforms complex medical reports into beautiful,
                  <br className="hidden md:block" />
                  actionable health intelligence for patients and clinicians alike.
                </p>
              </GlassText>
            </motion.div>

            <motion.section variants={itemVariants} className="w-full max-w-4xl">
              <GlassText className="!rounded-3xl px-5 py-5 sm:px-8">
                <div className="grid gap-4 text-left md:grid-cols-3">
                  {[
                    ["Medical Report AI", "Extract and organize report findings into readable health context."],
                    ["Health Trend Timeline", "Track changing markers across stored reports and patient history."],
                    ["Doctor Review Workflow", "Give clinicians source-linked context before reviewing a case."],
                  ].map(([title, body]) => (
                    <div key={title}>
                      <h2 className={`text-sm font-black uppercase tracking-[0.18em] ${isDark ? "text-cyan-300" : "text-blue-700"}`}>
                        {title}
                      </h2>
                      <p className={`mt-2 text-sm font-semibold leading-6 ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                        {body}
                      </p>
                    </div>
                  ))}
                </div>
              </GlassText>
            </motion.section>

            <motion.div variants={itemVariants} className="flex flex-col sm:flex-row items-center gap-5 pt-4">
              <GlassButton onClick={handleEnter} primary className="px-14 py-5 !rounded-2xl text-base !tracking-wide">
                Start System
                <svg className="w-5 h-5 transition-transform group-hover:translate-x-1 inline-block ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </GlassButton>

              <GlassButton
                onClick={handleInstallClick}
                className="px-10 py-5 !rounded-2xl text-base !tracking-wide"
              >
                <Download className="w-5 h-5 inline-block" />
                {isIOS ? "Add to Home Screen" : isInstallable ? "Install App" : "Get the App"}
              </GlassButton>
            </motion.div>

            {/* Platform badges */}
            <motion.div variants={itemVariants} className="flex items-center gap-3 opacity-60">
              {[
                { icon: Monitor, label: "Desktop", action: handleInstallClick },
                { icon: Smartphone, label: "Android", action: handleInstallClick },
                { icon: Apple, label: "iOS", action: () => setShowIOSGuide(true) },
              ].map(({ icon: Icon, label, action }) => (
                <button key={label} onClick={action} className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold border transition-colors ${ isDark ? "border-white/10 text-slate-400 hover:text-white hover:border-white/20" : "border-slate-200 text-slate-400 hover:text-slate-700 hover:border-slate-300"}`}>
                  <Icon size={12}/>{label}
                </button>
              ))}
            </motion.div>
          </motion.div>
        </main>

        <footer className="mt-auto px-4 py-8 sm:px-8 sm:py-10 md:px-12 md:py-12">
          <GlassText className="!rounded-2xl px-5 py-5 sm:px-8 md:px-10 md:py-6">
            <div className="flex flex-col items-center justify-between gap-4 md:flex-row md:gap-6">
              <span className={`text-[0.65rem] font-black uppercase tracking-[0.4em] transition-colors duration-700 ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                DoctorCopilot © 2026 · <span className={isDark ? "text-[var(--gold-primary)] opacity-60" : ""}>Futuristic Clinical Intelligence</span>
              </span>
              <div className="flex flex-wrap items-center justify-center gap-5 sm:gap-8">
                {[
                  { label: "Terms", to: "/terms" },
                  { label: "Privacy", to: "/privacy" },
                  { label: "Support", to: "/support" },
                  { label: "HIPAA Readiness", to: "/hipaa-readiness" },
                ].map((item) => (
                  <Link
                    key={item.label}
                    to={item.to}
                    className={`text-[0.65rem] font-black uppercase tracking-widest transition-colors ${isDark ? "text-slate-500 hover:text-[var(--cyan-primary)]" : "text-slate-400 hover:text-slate-700"}`}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
          </GlassText>
        </footer>
      </div>

      <AnimatePresence>
        {showIOSGuide && (
          <IOSGuide isDark={isDark} onClose={() => setShowIOSGuide(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}

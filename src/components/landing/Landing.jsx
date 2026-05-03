import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Download } from "lucide-react";
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
      style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
      className={`relative overflow-hidden rounded-2xl px-8 py-4 font-bold text-sm tracking-wide transition-all duration-300 backdrop-blur-xl backdrop-saturate-150 border border-white/40 dark:border-[var(--gold-primary)]/20 shadow-[0_4px_32px_rgba(255,255,255,0.25),inset_0_1px_0_rgba(255,255,255,0.6)] dark:shadow-[0_4px_32px_rgba(212,175,55,0.1),inset_0_1px_0_rgba(212,175,55,0.2)] bg-white/20 dark:bg-white/5 text-[var(--text-primary)] hover:bg-white/30 dark:hover:bg-white/10 ${primary ? "!bg-white/40 dark:!bg-[var(--gold-primary)]/20 !border-white/60 dark:!border-[var(--gold-primary)]/50" : ""} ${className}`}
    >
      <div className={`absolute inset-0 rounded-2xl bg-gradient-to-b ${isDark ? "from-[var(--gold-soft)]/10" : "from-white/30"} via-transparent to-transparent pointer-events-none`} />
      <span className="relative z-10 flex items-center gap-2">{children}</span>
    </motion.button>
  );
}

function GlassText({ children, className = "" }) {
  const { isDark } = useTheme();
  return (
    <div className={`relative rounded-3xl backdrop-blur-2xl backdrop-saturate-200 bg-white/15 dark:bg-white/5 border border-white/40 dark:border-[var(--gold-primary)]/20 shadow-[0_4px_24px_rgba(255,255,255,0.2),inset_0_1px_0_rgba(255,255,255,0.5)] dark:shadow-[0_4px_24px_rgba(212,175,55,0.1),inset_0_1px_0_rgba(212,175,55,0.2)] ${className}`}>
      <div className={`absolute inset-0 rounded-3xl bg-gradient-to-b ${isDark ? "from-[var(--gold-soft)]/10" : "from-white/20"} via-white/5 to-transparent pointer-events-none`} />
      <div className="relative z-10">{children}</div>
    </div>
  );
}

const ease = [0.22, 1, 0.36, 1];

export default function Landing() {
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const { allowFluid } = useAdaptiveVisuals();
  const { isInstallable, promptInstall } = usePWA();

  const handleEnter = () => navigate("/login");

  const etherColors = isDark
    ? ["#aa771c", "#d4af37", "#f3e5ab", "#bf953f"]
    : ["#bfdbfe", "#ddd6fe", "#fbcfe8", "#ffffff"];

  const containerV = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.25, duration: 0.8, ease } },
  };
  const itemV = {
    hidden: { opacity: 0, y: 30, filter: "blur(10px)" },
    visible: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 1.2, ease } },
  };

  return (
    <div className="relative min-h-[100svh] w-full overflow-hidden bg-[var(--bg-primary)] text-[var(--text-primary)] font-sans transition-colors duration-700">
      {allowFluid && <RefractionFilter />}

      <div className="fixed inset-0 z-0 pointer-events-none select-none">
        {allowFluid ? (
          <LiquidEther colors={etherColors} mouseForce={28} cursorSize={180} isViscous viscous={32} iterationsViscous={40} iterationsPoisson={40} resolution={0.5} isBounce={false} autoDemo autoSpeed={0.8} autoIntensity={3.2} takeoverDuration={0.4} autoResumeDelay={2500} autoRampDuration={1.2} className={`h-full w-full ${isDark ? "mix-blend-screen opacity-90" : "mix-blend-multiply opacity-80"}`} />
        ) : (
          <AmbientBackdrop palette={etherColors} opacity={isDark ? 0.9 : 0.75} className={isDark ? "mix-blend-screen" : "mix-blend-multiply"} />
        )}
      </div>

      <div className="fixed inset-0 z-[1] pointer-events-none" style={{ background: "radial-gradient(ellipse at center, transparent 30%, var(--vignette-color) 100%)" }} />

      <div className="relative z-10 flex min-h-[100svh] flex-col">

        {/* Header */}
        <header className="fixed left-0 right-0 top-0 z-50 px-3 py-3 sm:px-6 sm:py-5">
          <div className="mx-auto max-w-7xl">
            <GlassSurface width="100%" height="auto" borderRadius={24} backgroundOpacity={isDark ? 0.4 : 0.15} blur={28} brightness={isDark ? 90 : 110} saturation={2.5} className={`border px-4 py-3 sm:px-6 sm:py-4 transition-all duration-700 ${isDark ? "border-[var(--cyan-primary)]/20 shadow-[0_4px_30px_rgba(6,182,212,0.1),inset_0_1px_0_rgba(6,182,212,0.2)]" : "border-white/50 shadow-[0_4px_30px_rgba(255,255,255,0.3),inset_0_1px_0_rgba(255,255,255,0.7)]"}`}>
              <div className="flex w-full items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`h-8 w-8 sm:h-9 sm:w-9 shrink-0 rounded-2xl bg-gradient-to-tr ${isDark ? "from-[var(--gold-primary)] via-amber-200 to-[var(--gold-soft)] shadow-[0_0_20px_var(--gold-primary)]" : "from-blue-400 via-violet-400 to-rose-400"}`} />
                  <span className={`truncate text-base sm:text-xl font-black tracking-tight ${isDark ? "text-[#f3e5ab]" : "text-slate-800"}`}>DoctorCopilot</span>
                </div>
                <GlassButton onClick={handleEnter} primary className="!px-4 !py-2 sm:!px-6 sm:!py-2.5 !rounded-full !text-xs sm:!text-sm shrink-0">Enter System</GlassButton>
              </div>
            </GlassSurface>
          </div>
        </header>

        {/* Hero */}
        <main className="flex flex-1 flex-col items-center justify-center px-4 pb-16 pt-28 sm:px-6 sm:pt-36 md:pt-44">
          <motion.div variants={containerV} initial="hidden" animate="visible" className="w-full max-w-5xl flex flex-col items-center text-center gap-5 sm:gap-8">

            <motion.div variants={itemV}>
              <GlassText className={`px-5 py-2 !rounded-full inline-flex items-center gap-2.5 ${isDark ? "border-[var(--cyan-primary)]/30" : ""}`}>
                <div className={`h-1.5 w-1.5 rounded-full animate-pulse ${isDark ? "bg-[var(--cyan-primary)]" : "bg-violet-400"}`} />
                <span className={`text-[0.65rem] sm:text-[0.7rem] font-black uppercase tracking-[0.3em] ${isDark ? "text-[var(--cyan-primary)]" : "text-violet-700"}`}>Precision Medical AI</span>
              </GlassText>
            </motion.div>

            <motion.div variants={itemV} className="w-full">
              <GlassText className="relative overflow-hidden !rounded-[20px] sm:!rounded-[32px] md:!rounded-[40px] px-5 py-8 sm:px-8 sm:py-12 md:px-20 md:py-16 group">
                <div className="corner-bracket corner-tl" /><div className="corner-bracket corner-tr" />
                <div className="corner-bracket corner-bl" /><div className="corner-bracket corner-br" />
                <h1 className="relative z-10 text-[clamp(1.9rem,8vw,5.5rem)] font-black tracking-[-0.03em] leading-[1.05] text-[var(--text-primary)]">
                  <span className="block mb-1 uppercase tracking-tight">Understand Your Health.</span>
                  <span className="text-transparent bg-clip-text font-extrabold" style={{ backgroundImage: isDark ? "linear-gradient(135deg,#f3e5ab,#ffd700 50%,#f3e5ab)" : "linear-gradient(to right,#2563eb,#4f46e5,#7c3aed)" }}>Not Just Your Reports.</span>
                </h1>
              </GlassText>
            </motion.div>

            <motion.div variants={itemV} className="w-full max-w-3xl">
              <GlassText className="!rounded-2xl sm:!rounded-3xl px-5 py-5 sm:px-8 sm:py-6 md:px-10">
                <p className={`text-base sm:text-lg md:text-xl leading-[1.7] font-medium ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                  DoctorCopilot transforms complex medical reports into beautiful, actionable health intelligence for patients and clinicians alike.
                </p>
              </GlassText>
            </motion.div>

            <motion.section variants={itemV} className="w-full max-w-4xl">
              <GlassText className="!rounded-2xl sm:!rounded-3xl px-5 py-5 sm:px-8">
                <div className="grid gap-4 text-left sm:grid-cols-3">
                  {[
                    ["Medical Report AI", "Extract and organize report findings into readable health context."],
                    ["Health Trend Timeline", "Track changing markers across stored reports and patient history."],
                    ["Doctor Review Workflow", "Give clinicians source-linked context before reviewing a case."],
                  ].map(([title, body]) => (
                    <div key={title}>
                      <h2 className={`text-xs sm:text-sm font-black uppercase tracking-[0.18em] ${isDark ? "text-cyan-300" : "text-blue-700"}`}>{title}</h2>
                      <p className={`mt-2 text-xs sm:text-sm font-semibold leading-6 ${isDark ? "text-slate-400" : "text-slate-600"}`}>{body}</p>
                    </div>
                  ))}
                </div>
              </GlassText>
            </motion.section>

            <motion.div variants={itemV} className="flex flex-col sm:flex-row items-center gap-3 sm:gap-5 pt-2 w-full sm:w-auto">
              <GlassButton onClick={handleEnter} primary className="w-full sm:w-auto !px-10 sm:!px-14 !py-4 sm:!py-5 !rounded-2xl !text-sm sm:!text-base">
                Start System
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
              </GlassButton>
              {isInstallable && (
                <GlassButton onClick={promptInstall} className="w-full sm:w-auto !px-8 sm:!px-10 !py-4 sm:!py-5 !rounded-2xl !text-sm sm:!text-base">
                  <Download className="w-5 h-5" /> Install App
                </GlassButton>
              )}
            </motion.div>

          </motion.div>
        </main>

        {/* Footer */}
        <footer className="mt-auto px-4 py-5 sm:px-8 sm:py-10">
          <GlassText className="!rounded-2xl px-5 py-4 sm:px-8 sm:py-5 md:px-10 md:py-6">
            <div className="flex flex-col items-center justify-between gap-3 md:flex-row md:gap-6">
              <span className={`text-[0.6rem] sm:text-[0.65rem] font-black uppercase tracking-[0.35em] text-center ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                DoctorCopilot © 2026 · <span className={isDark ? "text-[var(--gold-primary)] opacity-60" : ""}>Futuristic Clinical Intelligence</span>
              </span>
              <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6">
                {[["Terms","/terms"],["Privacy","/privacy"],["Support","/support"],["HIPAA","/hipaa-readiness"]].map(([label, to]) => (
                  <Link key={label} to={to} className={`text-[0.6rem] sm:text-[0.65rem] font-black uppercase tracking-widest transition-colors ${isDark ? "text-slate-500 hover:text-[var(--cyan-primary)]" : "text-slate-400 hover:text-slate-700"}`}>{label}</Link>
                ))}
              </div>
            </div>
          </GlassText>
        </footer>

      </div>
    </div>
  );
}

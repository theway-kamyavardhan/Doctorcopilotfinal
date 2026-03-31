import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "../../context/ThemeContext";
import Lanyard from "../ui/lanyard";
import LiquidEther from "../ui/LiquidEther";
import GlassSurface from "../ui/GlassSurface";
import RefractionFilter from "../ui/RefractionFilter";
import { User, Stethoscope, ShieldCheck, ArrowRight, Mail, Lock, PlusCircle } from "lucide-react";
import { authService } from "../../services/auth.service";

const ROLES = [
  { id: 'patient', label: 'Patient', icon: User, color: '#06b6d4' },
  { id: 'doctor', label: 'Doctor', icon: Stethoscope, color: '#8b5cf6' },
  { id: 'admin', label: 'Admin', icon: ShieldCheck, color: '#f59e0b' },
];

export default function Login() {
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const [role, setRole] = useState('patient');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const activeRoleData = ROLES.find(r => r.id === role);

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsAuthenticating(true);
    try {
      await authService.loginUser({ username: identifier.trim(), password });
      const currentUser = await authService.getMe();
      const userRole = String(currentUser.role || role).toLowerCase();
      navigate(`/${userRole}/dashboard`);
    } catch (err) {
      console.error(err);
      alert(err.message || 'Verification failed. Neural link rejected.');
    } finally {
      setIsAuthenticating(false);
    }
  };

  const appleEase = [0.22, 1, 0.36, 1];

  // ULTRA PREMIUM LIQUID GRADIENT PALETTE
  const etherColors = isDark
    ? ["#020617", "#0f172a", "#1e1b4b", "#aa771c", "#d4af37", "#f3e5ab"]
    : ["#f8fafc", "#f1f5f9", "#e2e8f0", "#bfdbfe", "#ddd6fe", "#fbcfe8"];

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[var(--bg-primary)] text-[var(--text-primary)] font-sans selection:bg-cyan-500/30 transition-colors duration-1000">
      <RefractionFilter />

      {/* ── BACKGROUND: VIBRANT LIQUID GRADIENT ── */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <LiquidEther
          colors={etherColors}
          mouseForce={0}
          autoDemo={true}
          autoSpeed={0.8}
          autoIntensity={4.2}
          isViscous={true}
          viscous={24}
          resolution={0.6}
          className={`h-full w-full transition-all duration-1000 ${isDark ? 'mix-blend-screen opacity-70' : 'mix-blend-multiply opacity-50'}`}
        />

        {/* Cinematic Vignette Overlay */}
        <div
          className="absolute inset-0 z-[1] transition-colors duration-1000"
          style={{
            background: `radial-gradient(circle at center, transparent 10%, ${isDark ? 'rgba(2,4,10,0.7)' : 'rgba(255,255,255,0.3)'} 100%)`
          }}
        />
      </div>

      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 min-h-screen items-center px-6 lg:px-20 max-w-7xl mx-auto py-12">

        {/* ── LEFT: LANYARD (REFINED POSITIONING) ── */}
        <motion.div
          initial={{ opacity: 0, x: -40, filter: "blur(12px)" }}
          animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
          transition={{ duration: 1.2, ease: appleEase }}
          className="hidden lg:flex relative h-full items-start justify-center pt-16 pointer-events-none"
        >
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[750px]">
            <Lanyard
              role={role}
              idValue={identifier.split('@')[0].toUpperCase() || 'USER-ID'}
              passValue={password}
              status={isAuthenticating ? 'AUTHENTICATING' : (identifier && password ? 'READY' : 'IDLE')}
            />
          </div>
        </motion.div>

        {/* ── RIGHT: LOGIN FORM ── */}
        <motion.div
          initial={{ opacity: 0, y: 40, filter: "blur(12px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 1.2, delay: 0.2, ease: appleEase }}
          className="flex flex-col items-center lg:items-start"
        >
          <div className="w-full max-w-md">
            {/* Header */}
            <div className="mb-10 text-center lg:text-left">
              <motion.div
                layoutId="logo"
                className="inline-flex items-center gap-3 mb-6"
              >
                <div className={`h-8 w-8 rounded-full bg-gradient-to-tr ${isDark ? 'from-[var(--gold-primary)] via-amber-200 to-[var(--gold-soft)] shadow-[0_0_20px_var(--gold-primary)]' : 'from-blue-400 via-violet-400 to-rose-400 shadow-[0_0_16px_rgba(30,58,138,0.2)]'}`} />
                <span className={`text-2xl font-black tracking-tight uppercase ${isDark ? 'text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-500' : 'text-slate-800'}`}>DoctorCopilot</span>
              </motion.div>
              <h2 className="text-4xl font-black tracking-tight mb-3">System Access.</h2>
              <p className="text-[var(--text-secondary)] font-medium">Verify your credentials to initialize the link.</p>
            </div>

            {/* Role Selection */}
            <div className="grid grid-cols-3 gap-3 mb-8">
              {ROLES.map((r) => {
                const Icon = r.icon;
                const isActive = role === r.id;
                return (
                  <button
                    key={r.id}
                    onClick={() => setRole(r.id)}
                    className={`
                      relative group flex flex-col items-center justify-center py-4 rounded-2xl border transition-all duration-700
                      ${isActive
                        ? (isDark ? 'bg-white/10 border-[var(--gold-soft)]/40 shadow-[0_0_30px_rgba(212,175,55,0.2)]' : 'bg-white/40 border-white shadow-lg')
                        : (isDark ? 'bg-white/5 border-white/5 hover:border-white/20 grayscale' : 'bg-white/15 border-white/40 hover:bg-white/30 grayscale')}
                      hover:grayscale-0
                    `}
                  >
                    <div className={`p-2 rounded-xl mb-2 transition-transform duration-500 ${isActive ? 'scale-110 shadow-[0_0_20px_-3px_currentColor]' : 'text-slate-400 opacity-60'}`} style={{ color: isActive ? r.color : '' }}>
                      <Icon size={24} strokeWidth={1.5} />
                    </div>
                    <span className={`text-[0.6rem] font-bold uppercase tracking-[0.2em] transition-colors duration-500 ${isActive ? (isDark ? 'text-[var(--gold-soft)]' : 'text-slate-900') : 'text-slate-500'}`}>
                      {r.label}
                    </span>
                    {isActive && (
                      <motion.div
                        layoutId="activeRoleBar"
                        className="absolute bottom-2 h-1 w-6 rounded-full"
                        style={{ backgroundColor: r.color }}
                      />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Login Form */}
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-4">
                <GlassSurface
                  width="100%"
                  height="auto"
                  borderRadius={24}
                  backgroundOpacity={isDark ? 0.08 : 0.6}
                  brightness={isDark ? 30 : 120}
                  className={`px-6 py-2 border transition-all duration-700 ${isDark ? 'border-white/10 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)]' : 'border-white/60 shadow-sm'}`}
                >
                  <div className="flex items-center gap-4 w-full">
                    <Mail size={18} className={isDark ? "text-[var(--gold-soft)] opacity-60" : "text-slate-400"} />
                    <input
                      type="text"
                      placeholder="User Identifier (ID) / Email"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      className="w-full py-4 bg-transparent border-none focus:ring-0 text-sm font-bold outline-none placeholder:text-slate-400 dark:placeholder:text-slate-600 transition-colors"
                    />
                  </div>
                </GlassSurface>

                <GlassSurface
                  width="100%"
                  height="auto"
                  borderRadius={24}
                  backgroundOpacity={isDark ? 0.08 : 0.6}
                  brightness={isDark ? 30 : 120}
                  className={`px-6 py-2 border transition-all duration-700 ${isDark ? 'border-white/10 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)]' : 'border-white/60 shadow-sm'}`}
                >
                  <div className="flex items-center gap-4 w-full">
                    <Lock size={18} className={isDark ? "text-[var(--gold-soft)] opacity-60" : "text-slate-400"} />
                    <input
                      type="password"
                      placeholder="Password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full py-4 bg-transparent border-none focus:ring-0 text-sm font-bold outline-none placeholder:text-slate-400 dark:placeholder:text-slate-600 transition-colors"
                    />
                  </div>
                </GlassSurface>
              </div>

              <div className="flex items-center justify-between px-2 text-[0.65rem] font-bold uppercase tracking-widest text-slate-500">
                <label className="flex items-center gap-2 cursor-pointer hover:text-slate-300 transition-colors">
                  <input type="checkbox" className="rounded bg-white/10 border-white/20 checked:bg-[var(--gold-primary)]" />
                  Persistence
                </label>
                <a href="#" className="hover:text-amber-200 transition-colors">Recover Key</a>
              </div>

              <button
                type="submit"
                disabled={isAuthenticating}
                className="relative w-full py-5 flex items-center justify-center gap-3 overflow-hidden rounded-2xl font-black text-sm uppercase tracking-[0.2em] transition-all duration-500 group"
              >
                {/* Button Glass Effect */}
                <div className={`absolute inset-0 transition-all duration-500 ${isDark ? 'bg-gradient-to-r from-amber-600/30 via-yellow-500/20 to-amber-600/30' : 'bg-white/20'} backdrop-blur-xl border border-white/30 dark:border-white/10 group-hover:scale-105`} />
                <div
                  className="absolute inset-x-0 bottom-0 h-1 transition-all duration-500 opacity-80"
                  style={{ backgroundColor: activeRoleData?.color }}
                />

                <span className={`relative z-10 flex items-center gap-3 ${isDark ? 'text-amber-100' : 'text-slate-800'}`}>
                  {isAuthenticating ? 'Initializing System...' : 'Synchronize Access'}
                  {!isAuthenticating && <ArrowRight size={18} className="transition-transform duration-500 group-hover:translate-x-1" />}
                  {isAuthenticating && (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                    >
                      <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full" />
                    </motion.div>
                  )}
                </span>
              </button>
            </form>

            {/* Footer Options */}
            <AnimatePresence>
              {role === 'patient' && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="mt-8 pt-8 border-t border-white/5 w-full text-center lg:text-left"
                >
                  <p className="text-[0.6rem] font-bold uppercase tracking-[0.3em] text-slate-500 mb-4 items-center flex justify-center lg:justify-start gap-3">
                    New Subject?
                  </p>
                  <button 
                    onClick={() => navigate('/register/patient')}
                    className={`flex items-center gap-2 px-8 py-3 rounded-full border text-[0.65rem] font-black uppercase tracking-widest transition-all duration-500 group ${isDark ? 'bg-white/5 border-white/10 text-amber-200/80 hover:bg-white/10' : 'bg-white/20 border-white/40 text-slate-800 hover:bg-white/30'}`}
                  >
                    <PlusCircle size={16} className="text-cyan-400 group-hover:rotate-90 transition-transform duration-500" />
                    Create Medical Profile
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

      </div>
    </div>
  );
}

import React, { useEffect, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  CalendarDays,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  Settings,
  Stethoscope,
  UserRoundSearch,
  X,
} from "lucide-react";
import { useTheme } from "../../context/ThemeContext";
import { authService } from "../../services/auth.service";
import GlassSurface from "../ui/GlassSurface";
import AiSessionBanner from "../ui/AiSessionBanner";
import { getDoctorProfile } from "../../services/doctor.service";
import useViewport from "../../hooks/useViewport";

const NAV_ITEMS = [
  { name: "Dashboard", path: "/doctor/dashboard", icon: LayoutDashboard },
  { name: "Cases", path: "/doctor/cases", icon: Stethoscope },
  { name: "Chats", path: "/doctor/chats", icon: MessageSquare },
  { name: "Calendar", path: "/doctor/calendar", icon: CalendarDays },
  { name: "Settings", path: "/doctor/settings", icon: Settings },
];

export default function DoctorLayout() {
  const { isMobile } = useViewport();
  const { isDark } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [doctorName, setDoctorName] = useState("Doctor Workspace");
  const [doctorMeta, setDoctorMeta] = useState("Authenticated doctor session");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    let mounted = true;

    getDoctorProfile()
      .then((profile) => {
        if (!mounted) return;
        setDoctorName(profile?.user?.full_name || "Doctor Workspace");
        setDoctorMeta(
          [profile?.specialization, profile?.hospital].filter(Boolean).join(" | ") ||
            "Authenticated doctor session"
        );
      })
      .catch(() => {
        if (!mounted) return;
        setDoctorName("Doctor Workspace");
        setDoctorMeta("Authenticated doctor session");
      });

    return () => {
      mounted = false;
    };
  }, []);

  const handleLogout = () => {
    authService.logout();
    navigate("/login");
  };

  if (isMobile) {
    return (
      <DoctorMobileLayout
        isDark={isDark}
        location={location}
        handleLogout={handleLogout}
        doctorName={doctorName}
        doctorMeta={doctorMeta}
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
      />
    );
  }

  return (
    <div
      className={`min-h-screen px-3 py-3 sm:px-4 sm:py-4 md:px-6 md:py-5 ${
        isDark
          ? "bg-[radial-gradient(circle_at_top,rgba(99,102,241,0.12),transparent_20%),linear-gradient(180deg,#030712,#0b1120_60%,#030712)]"
          : "bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.12),transparent_18%),linear-gradient(180deg,#f8fbff,#edf4fb_60%,#f8fbff)]"
      }`}
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-4 sm:gap-5">
        <GlossyHeader
          isDark={isDark}
          location={location}
          handleLogout={handleLogout}
          doctorName={doctorName}
          doctorMeta={doctorMeta}
          mobileMenuOpen={mobileMenuOpen}
          setMobileMenuOpen={setMobileMenuOpen}
        />
        <GlossyMain isDark={isDark} location={location} />
      </div>
    </div>
  );
}

function DoctorMobileLayout({
  isDark,
  location,
  handleLogout,
  doctorName,
  doctorMeta,
  mobileMenuOpen,
  setMobileMenuOpen,
}) {
  const primaryItems = NAV_ITEMS.slice(0, 4);
  const activeItem = NAV_ITEMS.find((item) => location.pathname.startsWith(item.path)) || NAV_ITEMS[0];

  return (
    <div
      className={`min-h-screen main-mobile ${
        isDark
          ? "bg-[#070910] text-white"
          : "bg-[#f6f7fb] text-slate-950"
      }`}
    >
      <div
        className={`mobile-app-header ${
          isDark
            ? "bg-[#070910]/88"
            : "bg-[#f6f7fb]/88"
        }`}
      >
        <div className="mobile-top-card">
          <div className="mobile-role-mark bg-gradient-to-br from-violet-500 via-indigo-500 to-blue-600">
            {React.createElement(activeItem.icon, { size: 19 })}
          </div>
          <div className="min-w-0">
            <span className={`mobile-eyebrow ${
              isDark ? "text-violet-400/75" : "text-violet-600/75"
            }`}>Doctor workspace</span>
            <div className="mobile-title-line">{doctorName}</div>
          </div>
          <button
            type="button"
            onClick={() => setMobileMenuOpen((open) => !open)}
            className={`mobile-context-pill inline-flex items-center justify-center ${
              isDark ? "bg-white/8 text-slate-300" : "bg-white text-slate-600 border border-slate-200"
            }`}
            aria-label="Toggle doctor menu"
          >
            {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>

        <div className="mobile-quick-strip">
          <Link
            to="/doctor/cases"
            className={`mobile-quick-action ${
              isDark ? "bg-violet-400/12 text-violet-200" : "bg-violet-600 text-white"
            }`}
          >
            <UserRoundSearch size={15} />
            Queue
          </Link>
          <Link
            to="/doctor/chats"
            className={`mobile-quick-action ${
              isDark ? "bg-white/7 text-slate-200" : "bg-white text-slate-700 shadow-sm"
            }`}
          >
            <MessageSquare size={15} />
            Chats
          </Link>
          <Link
            to="/doctor/calendar"
            className={`mobile-quick-action ${
              isDark ? "bg-white/7 text-slate-200" : "bg-white text-slate-700 shadow-sm"
            }`}
          >
            <CalendarDays size={15} />
            Calendar
          </Link>
        </div>
      </div>

      {/* ── Slide-up drawer ── */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setMobileMenuOpen(false)}
              className="fixed inset-0 z-50 bg-black/60"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 380, damping: 38 }}
              className={`mobile-menu-sheet ${
                isDark
                  ? "bg-[#10131d] border-t border-white/10 text-white"
                  : "bg-white border-t border-slate-200 text-slate-950"
              }`}
            >
              <div className="flex justify-center pt-3 pb-2">
                <div className={`h-1 w-10 rounded-full ${isDark ? "bg-white/20" : "bg-slate-300"}`} />
              </div>

              {/* Doctor profile strip */}
              <div className={`mx-4 mb-4 flex items-center gap-3 rounded-2xl px-4 py-3 ${
                isDark ? "bg-white/5" : "bg-slate-50"
              }`}>
                <div className={`h-10 w-10 shrink-0 rounded-xl flex items-center justify-center text-white font-black ${
                  isDark ? "bg-gradient-to-br from-violet-500 to-indigo-600" : "bg-gradient-to-br from-violet-500 to-indigo-600"
                }`}>{doctorName.charAt(0)}</div>
                <div className="min-w-0">
                  <div className="font-black text-sm truncate">{doctorName}</div>
                  <div className={`text-xs truncate ${
                    isDark ? "text-slate-400" : "text-slate-500"
                  }`}>{doctorMeta}</div>
                </div>
              </div>

              <div className="px-4 pb-2">
                <p className={`text-[10px] font-black uppercase tracking-[0.22em] ${
                  isDark ? "text-slate-500" : "text-slate-400"
                }`}>Navigate</p>
              </div>

              <nav className="mobile-menu-grid px-1 pb-3">
                {NAV_ITEMS.map((item) => {
                  const isActive = location.pathname.startsWith(item.path);
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`mobile-menu-link transition-all ${
                        isActive
                          ? isDark
                            ? "bg-violet-500/15 text-violet-300"
                            : "bg-violet-50 text-violet-700"
                          : isDark
                            ? "bg-white/5 text-slate-300"
                            : "bg-slate-50 text-slate-700"
                      }`}
                    >
                      <Icon size={18} />
                      {item.name}
                    </Link>
                  );
                })}
              </nav>

              <div className="px-1">
                <button
                  type="button"
                  onClick={handleLogout}
                  className={`w-full flex items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-bold ${
                    isDark ? "bg-rose-500/10 text-rose-400" : "bg-rose-50 text-rose-600"
                  }`}
                >
                  <LogOut size={16} />
                  Sign out
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <main className="px-3 pt-3">
        <AiSessionBanner />
        <Outlet />
      </main>

      <div
        className={`mobile-bottom-tabs ${
          isDark
            ? "bg-[#080b13]/92 border-t border-white/[0.07]"
            : "bg-white/95 border-t border-slate-200"
        }`}
      >
        <nav>
          {primaryItems.map((item) => {
            const isActive = location.pathname.startsWith(item.path);
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`mobile-tab-item transition-colors ${
                  isActive
                    ? isDark
                      ? "text-violet-400"
                      : "text-violet-600"
                    : isDark
                      ? "text-slate-500"
                      : "text-slate-400"
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="mobile-doctor-tab"
                    className={`absolute top-1 inset-x-5 h-1 rounded-full ${
                      isDark ? "bg-violet-400" : "bg-violet-500"
                    }`}
                    transition={{ type: "spring", stiffness: 400, damping: 34 }}
                  />
                )}
                <motion.div whileTap={{ scale: 0.82 }} transition={{ type: "spring", stiffness: 500, damping: 25 }}>
                  <Icon size={20} strokeWidth={isActive ? 2.2 : 1.8} />
                </motion.div>
                <span>{item.name}</span>
              </Link>
            );
          })}

          {/* More / Settings */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen((open) => !open)}
            className={`mobile-tab-item transition-colors ${
              mobileMenuOpen
                ? isDark ? "text-violet-400" : "text-violet-600"
                : isDark ? "text-slate-500" : "text-slate-400"
            }`}
          >
            {mobileMenuOpen && (
              <motion.div
                layoutId="mobile-doctor-tab"
                className={`absolute top-1 inset-x-5 h-1 rounded-full ${
                  isDark ? "bg-violet-400" : "bg-violet-500"
                }`}
                transition={{ type: "spring", stiffness: 400, damping: 34 }}
              />
            )}
            <motion.div whileTap={{ scale: 0.82 }} transition={{ type: "spring", stiffness: 500, damping: 25 }}>
              {mobileMenuOpen ? <X size={20} strokeWidth={2.2} /> : <Menu size={20} strokeWidth={1.8} />}
            </motion.div>
            <span>More</span>
          </button>
        </nav>
      </div>
    </div>
  );
}

function GlossyHeader({
  isDark,
  location,
  handleLogout,
  doctorName,
  doctorMeta,
  mobileMenuOpen,
  setMobileMenuOpen,
}) {
  return (
    <GlassSurface
      width="100%"
      height="auto"
      borderRadius={32}
      backgroundOpacity={isDark ? 0.3 : 0.15}
      blur={40}
      brightness={isDark ? 110 : 120}
      saturation={2.5}
      className={`border px-4 py-4 transition-all duration-700 sm:px-5 lg:py-5 ${
        isDark
          ? "border-[var(--cyan-primary)]/20 text-white shadow-[0_8px_40px_rgba(6,182,212,0.12),inset_0_1px_0_rgba(6,182,212,0.2)]"
          : "border-white/50 text-slate-900 shadow-[0_8px_40px_rgba(30,58,138,0.06),inset_0_1px_0_rgba(255,255,255,0.8)]"
      }`}
    >
      <div className="relative z-10 flex h-full w-full flex-col gap-4">
        <div className="flex items-start justify-between gap-3 lg:items-center">
          <div className="flex min-w-0 items-center gap-4">
            <div
              className={`h-10 w-10 shrink-0 rounded-2xl bg-gradient-to-tr ${
                isDark
                  ? "from-[var(--gold-primary)] via-amber-200 to-[var(--gold-soft)] shadow-[0_0_20px_var(--gold-primary)]"
                  : "from-blue-400 via-violet-400 to-rose-400 shadow-[0_0_16px_rgba(30,58,138,0.2)]"
              }`}
            />
            <div className="min-w-0">
              <div
                className={`text-[10px] font-black uppercase tracking-[0.26em] ${
                  isDark ? "text-cyan-300/80" : "text-blue-700/75"
                }`}
              >
                Doctor Workspace
              </div>
              <h1
                className={`mt-0.5 truncate text-xl font-black tracking-tighter sm:text-2xl ${
                  isDark ? "text-[#f3e5ab]" : "text-slate-800"
                }`}
              >
                {doctorName}
              </h1>
              <p className={`mt-1 text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>{doctorMeta}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 lg:hidden">
            <button
              type="button"
              onClick={handleLogout}
              className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-bold ${
                isDark ? "bg-rose-500/10 text-rose-200" : "bg-rose-100 text-rose-600"
              }`}
            >
              <LogOut size={14} />
              Exit
            </button>
            <button
              type="button"
              onClick={() => setMobileMenuOpen((open) => !open)}
              className={`inline-flex rounded-full p-2 ${isDark ? "bg-white/5 text-white" : "bg-slate-100 text-slate-700"}`}
              aria-label="Toggle doctor navigation"
            >
              {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>

        <nav className={`${mobileMenuOpen ? "grid grid-cols-1 gap-2 sm:grid-cols-2 lg:flex" : "hidden lg:flex"} items-center gap-1.5 md:gap-2`}>
          {NAV_ITEMS.map((item) => {
            const isActive = location.pathname.startsWith(item.path);
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`group relative inline-flex items-center gap-2 overflow-hidden rounded-full px-4 py-2.5 text-[13px] font-bold transition-all z-10 ${
                  isActive
                    ? isDark
                      ? "border border-cyan-400/30 text-cyan-200 shadow-[0_0_20px_rgba(6,182,212,0.15)]"
                      : "border border-blue-200 text-blue-700 shadow-sm"
                    : isDark
                      ? "border border-transparent text-slate-300 hover:bg-white/[0.08] hover:text-white"
                      : "border border-transparent text-slate-600 hover:bg-white/60 hover:text-slate-900"
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="desktop-doctor-nav-active"
                    className={`absolute inset-0 -z-10 ${isDark ? "bg-cyan-500/20" : "bg-blue-100"}`}
                    transition={{ type: "spring", stiffness: 350, damping: 30 }}
                  >
                    <span className="absolute inset-0 -translate-x-[100%] bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-1000 group-hover:translate-x-[100%]" />
                  </motion.div>
                )}
                <Icon size={16} className={isActive ? (isDark ? "text-cyan-300" : "text-blue-600") : "opacity-70"} />
                <span>{item.name}</span>
              </Link>
            );
          })}

          <div className={`mx-1 hidden h-8 w-px lg:block ${isDark ? "bg-white/10" : "bg-slate-300/50"}`} />

          <button
            type="button"
            onClick={handleLogout}
            className={`hidden items-center gap-2 rounded-full border border-transparent px-4 py-2.5 text-[13px] font-bold transition-all lg:inline-flex ${
              isDark
                ? "text-rose-300 hover:border-rose-500/20 hover:bg-rose-500/15"
                : "text-rose-600 hover:border-rose-200 hover:bg-rose-100"
            }`}
          >
            <LogOut size={16} className="opacity-80" />
            Sign out
          </button>
        </nav>
      </div>
    </GlassSurface>
  );
}

function GlossyMain({ isDark, location }) {
  return (
    <motion.main
      key={location.pathname}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      className="w-full flex-1"
      style={{ willChange: "opacity, transform" }}
    >
      <GlassSurface
        width="100%"
        height="100%"
        borderRadius={32}
        backgroundOpacity={isDark ? 0.25 : 0.4}
        blur={20}
        brightness={isDark ? 95 : 120}
        saturation={1.5}
        className={`border p-4 sm:p-5 md:p-8 ${
          isDark
            ? "border-white/10 text-white shadow-[0_24px_80px_rgba(2,6,23,0.32),inset_0_1px_0_rgba(255,255,255,0.05)]"
            : "border-white/60 text-slate-900 shadow-[0_20px_80px_rgba(15,23,42,0.06),inset_0_1px_0_rgba(255,255,255,1)]"
        }`}
      >
        <div className="relative z-10">
          <AiSessionBanner />
          <Outlet />
        </div>
      </GlassSurface>
    </motion.main>
  );
}

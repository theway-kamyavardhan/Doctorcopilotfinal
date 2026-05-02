import React, { useMemo, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  CalendarDays,
  ClipboardList,
  FileText,
  History,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  Search,
  Settings,
  TrendingUp,
  X,
} from "lucide-react";
import { useTheme } from "../../context/ThemeContext";
import { authService } from "../../services/auth.service";
import AmbientBackdrop from "../ui/AmbientBackdrop";
import AiSessionBanner from "../ui/AiSessionBanner";
import GlassSurface from "../ui/GlassSurface";
import RefractionFilter from "../ui/RefractionFilter";
import useViewport from "../../hooks/useViewport";
import useAdaptiveVisuals from "../../hooks/useAdaptiveVisuals";

export default function PatientLayout() {
  const { isMobile } = useViewport();
  const { isDark } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { name: "Dashboard", path: "/patient/dashboard", icon: LayoutDashboard },
    { name: "Timeline", path: "/patient/timeline", icon: History },
    { name: "Calendar", path: "/patient/calendar", icon: CalendarDays },
    { name: "Trends", path: "/patient/trends", icon: TrendingUp },
    { name: "Reports", path: "/patient/reports", icon: FileText },
    { name: "Your Cases", path: "/patient/cases", icon: ClipboardList },
    { name: "Chats", path: "/patient/chats", icon: MessageSquare },
    { name: "Settings", path: "/patient/settings", icon: Settings },
  ];

  const primaryMobileLinks = [
    navLinks[0],
    navLinks[1],
    navLinks[4],
    navLinks[5],
  ];

  const etherColors = isDark
    ? ["#020617", "#0f172a", "#1e1b4b", "#06b6d4", "#2563eb", "#000000"]
    : ["#f8fafc", "#f1f5f9", "#e2e8f0", "#bfdbfe", "#ddd6fe", "#ffffff"];

  const activeLink = useMemo(
    () => navLinks.find((link) => location.pathname === link.path) || navLinks[0],
    [location.pathname]
  );

  const handleLogout = () => {
    authService.logout();
    navigate("/login", { replace: true });
  };

  if (isMobile) {
    return (
      <PatientMobileLayout
        isDark={isDark}
        location={location}
        navLinks={navLinks}
        primaryMobileLinks={primaryMobileLinks}
        activeLink={activeLink}
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
        handleLogout={handleLogout}
      />
    );
  }

  return (
    <PatientDesktopLayout
      isDark={isDark}
      location={location}
      navLinks={navLinks}
      primaryMobileLinks={primaryMobileLinks}
      activeLink={activeLink}
      mobileMenuOpen={mobileMenuOpen}
      setMobileMenuOpen={setMobileMenuOpen}
      handleLogout={handleLogout}
      etherColors={etherColors}
    />
  );
}

function PatientDesktopLayout({
  isDark,
  location,
  navLinks,
  primaryMobileLinks,
  activeLink,
  mobileMenuOpen,
  setMobileMenuOpen,
  handleLogout,
  etherColors,
}) {
  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[var(--bg-primary)] font-sans text-[var(--text-primary)] transition-colors duration-700">
      <RefractionFilter />

      <div className="fixed inset-0 z-0 pointer-events-none select-none">
        <AmbientBackdrop
          palette={etherColors}
          opacity={isDark ? 0.38 : 0.26}
          className={isDark ? "mix-blend-screen" : "mix-blend-multiply"}
        />
      </div>

      <div
        className="fixed inset-0 z-[1] pointer-events-none transition-colors duration-1000"
        style={{ background: "radial-gradient(ellipse at center, transparent 40%, var(--vignette-color) 100%)" }}
      />

      <div className="relative z-10 flex min-h-screen flex-col">
        <header className="sticky top-0 z-50 px-3 py-3 transition-all duration-300 sm:px-4 sm:py-4 md:px-6 md:py-6">
          <div className="mx-auto max-w-[1600px]">
            <GlassSurface
              width="100%"
              height="auto"
              borderRadius={28}
              backgroundOpacity={isDark ? 0.4 : 0.15}
              blur={28}
              brightness={isDark ? 90 : 110}
              saturation={2.5}
              className={`border px-4 py-4 transition-all duration-700 sm:px-5 md:px-8 ${
                isDark
                  ? "border-[var(--cyan-primary)]/20 shadow-[0_4px_30px_rgba(6,182,212,0.1),inset_0_1px_0_rgba(6,182,212,0.2)]"
                  : "border-white/50 shadow-[0_4px_30px_rgba(255,255,255,0.3),inset_0_1px_0_rgba(255,255,255,0.7)]"
              }`}
            >
              <div className="flex w-full flex-col gap-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 flex items-center gap-3">
                    <div
                      className={`h-7 w-7 shrink-0 rounded-full bg-gradient-to-tr ${
                        isDark
                          ? "from-[var(--cyan-primary)] via-blue-400 to-indigo-500 shadow-[0_0_20px_var(--cyan-primary)]"
                          : "from-blue-400 via-violet-400 to-rose-400"
                      }`}
                    />
                    <div className="min-w-0">
                      <span
                        className={`block truncate text-lg font-black tracking-tight sm:text-xl ${
                          isDark ? "bg-[var(--cyan-primary)] bg-clip-text text-transparent" : "text-slate-800"
                        }`}
                      >
                        DoctorCopilot
                      </span>
                      <span
                        className={`block text-[11px] font-bold uppercase tracking-[0.18em] md:hidden ${
                          isDark ? "text-slate-400" : "text-slate-500"
                        }`}
                      >
                        {activeLink.name}
                      </span>
                    </div>
                  </div>

                  <nav className="hidden md:flex md:flex-1 md:flex-wrap md:items-center md:justify-center md:gap-2">
                    {navLinks.map((link) => {
                      const isActive = location.pathname === link.path;
                      const Icon = link.icon;
                      return (
                        <NavLink
                          key={link.name}
                          to={link.path}
                          className={`relative flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold tracking-wide transition-all duration-300 lg:px-5 z-10 ${
                            isActive
                              ? isDark
                                ? "text-[var(--cyan-primary)]"
                                : "text-blue-700"
                              : isDark
                                ? "text-slate-400 hover:bg-white/5 hover:text-slate-200"
                                : "text-slate-500 hover:bg-black/5 hover:text-slate-800"
                          }`}
                        >
                          {isActive && (
                            <motion.div
                              layoutId="desktop-patient-nav-active"
                              className={`absolute inset-0 rounded-full -z-10 ${
                                isDark
                                  ? "bg-[var(--cyan-primary)]/10 shadow-[inset_0_1px_0_0_rgba(6,182,212,0.2)]"
                                  : "bg-blue-500/10 shadow-[inset_0_1px_0_0_rgba(59,130,246,0.3)]"
                              }`}
                              transition={{ type: "spring", stiffness: 350, damping: 30 }}
                            />
                          )}
                          <Icon size={14} className={isActive ? "opacity-100" : "opacity-70"} />
                          <span>{link.name}</span>
                        </NavLink>
                      );
                    })}
                  </nav>

                  <div className="flex items-center gap-2 sm:gap-4">
                    <div
                      className={`hidden items-center gap-2 rounded-full border px-4 py-1.5 backdrop-blur-md lg:flex ${
                        isDark ? "border-white/10 bg-slate-900/50" : "border-slate-200 bg-white/50"
                      }`}
                    >
                      <Search size={14} className={isDark ? "text-slate-400" : "text-slate-500"} />
                      <input
                        type="text"
                        placeholder="Search reports..."
                        className="w-32 bg-transparent border-none text-xs outline-none transition-all duration-300 placeholder:opacity-50 focus:w-48"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={handleLogout}
                      className="hidden rounded-full p-2 transition-colors duration-300 hover:bg-red-500/10 hover:text-red-500 md:inline-flex"
                    >
                      <LogOut size={18} className="opacity-70" />
                    </button>

                    <button
                      type="button"
                      onClick={() => setMobileMenuOpen((open) => !open)}
                      className={`inline-flex rounded-full p-2 md:hidden ${
                        isDark ? "bg-white/5 text-slate-200" : "bg-slate-100 text-slate-700"
                      }`}
                      aria-label="Toggle patient navigation"
                    >
                      {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
                    </button>
                  </div>
                </div>

                {mobileMenuOpen ? (
                  <nav className="grid gap-2 md:hidden">
                    {navLinks.map((link) => {
                      const isActive = location.pathname === link.path;
                      const Icon = link.icon;
                      return (
                        <NavLink
                          key={link.name}
                          to={link.path}
                          onClick={() => setMobileMenuOpen(false)}
                          className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold transition-all ${
                            isActive
                              ? isDark
                                ? "bg-cyan-500/10 text-cyan-200"
                                : "bg-blue-100 text-blue-700"
                              : isDark
                                ? "bg-white/5 text-slate-300"
                                : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          <Icon size={16} />
                          {link.name}
                        </NavLink>
                      );
                    })}
                    <button
                      type="button"
                      onClick={handleLogout}
                      className={`mt-2 flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold ${
                        isDark ? "bg-rose-500/10 text-rose-200" : "bg-rose-100 text-rose-700"
                      }`}
                    >
                      <LogOut size={16} />
                      Sign out
                    </button>
                  </nav>
                ) : null}
              </div>
            </GlassSurface>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1600px] flex-1 px-3 py-4 pb-24 sm:px-4 sm:py-5 sm:pb-24 md:px-6 md:py-6 md:pb-6">
          <AiSessionBanner />
          <Outlet />
        </main>

        <div className="fixed inset-x-0 bottom-0 z-40 px-3 pb-3 md:hidden">
          <GlassSurface
            width="100%"
            height="auto"
            borderRadius={24}
            backgroundOpacity={isDark ? 0.55 : 0.78}
            blur={24}
            brightness={isDark ? 90 : 110}
            saturation={2}
            className={`border px-2 py-2 ${
              isDark
                ? "border-white/10 shadow-[0_-12px_40px_rgba(2,6,23,0.45)]"
                : "border-white/80 shadow-[0_-10px_30px_rgba(15,23,42,0.12)]"
            }`}
          >
            <nav className="grid grid-cols-5 gap-1">
              {primaryMobileLinks.map((link) => {
                const isActive = location.pathname === link.path;
                const Icon = link.icon;
                return (
                  <NavLink
                    key={link.path}
                    to={link.path}
                    className={`flex flex-col items-center gap-1 rounded-2xl px-2 py-2 text-[11px] font-bold transition-all ${
                      isActive
                        ? isDark
                          ? "bg-cyan-500/12 text-cyan-200"
                          : "bg-blue-100 text-blue-700"
                        : isDark
                          ? "text-slate-300"
                          : "text-slate-600"
                    }`}
                  >
                    <Icon size={16} />
                    <span className="truncate">{link.name}</span>
                  </NavLink>
                );
              })}
              <button
                type="button"
                onClick={() => setMobileMenuOpen((open) => !open)}
                className={`flex flex-col items-center gap-1 rounded-2xl px-2 py-2 text-[11px] font-bold ${
                  mobileMenuOpen
                    ? isDark
                      ? "bg-cyan-500/12 text-cyan-200"
                      : "bg-blue-100 text-blue-700"
                    : isDark
                      ? "text-slate-300"
                      : "text-slate-600"
                }`}
              >
                {mobileMenuOpen ? <X size={16} /> : <Menu size={16} />}
                <span>More</span>
              </button>
            </nav>
          </GlassSurface>
        </div>
      </div>
    </div>
  );
}

function PatientMobileLayout({
  isDark,
  location,
  navLinks,
  primaryMobileLinks,
  activeLink,
  mobileMenuOpen,
  setMobileMenuOpen,
  handleLogout,
}) {
  return (
    <div
      className={`min-h-screen main-mobile ${
        isDark
          ? "bg-[#080c18] text-white"
          : "bg-[#f2f5f9] text-slate-900"
      }`}
    >
      {/* ── Compact native-style header ── */}
      <div
        className={`sticky top-0 z-40 flex items-center justify-between px-4 pt-safe ${
          isDark
            ? "bg-[#080c18] border-b border-white/[0.06]"
            : "bg-[#f2f5f9] border-b border-slate-200/60"
        }`}
        style={{ paddingTop: `max(0.75rem, env(safe-area-inset-top))`, paddingBottom: "0.75rem" }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className={`h-7 w-7 rounded-xl ${
              isDark
                ? "bg-gradient-to-br from-cyan-500 to-blue-600"
                : "bg-gradient-to-br from-blue-500 to-violet-500"
            }`}
          />
          <div>
            <div className={`text-[10px] font-black uppercase tracking-[0.22em] leading-none ${
              isDark ? "text-cyan-400/70" : "text-blue-600/70"
            }`}>Patient</div>
            <div className="text-base font-black tracking-tight leading-tight">DoctorCopilot</div>
          </div>
        </div>
        <div className={`rounded-full px-3 py-1 text-[11px] font-bold ${
          isDark ? "bg-white/8 text-slate-300" : "bg-white text-slate-600 border border-slate-200"
        }`}>{activeLink.name}</div>
      </div>

      {/* ── Slide-up full-screen drawer ── */}
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
              className={`fixed bottom-0 left-0 right-0 z-50 rounded-t-[2rem] ${
                isDark
                  ? "bg-[#0f1420] border-t border-white/10"
                  : "bg-white border-t border-slate-200"
              }`}
              style={{ paddingBottom: "max(1.25rem, env(safe-area-inset-bottom))" }}
            >
              {/* Handle */}
              <div className="flex justify-center pt-3 pb-2">
                <div className={`h-1 w-10 rounded-full ${
                  isDark ? "bg-white/20" : "bg-slate-300"
                }`} />
              </div>

              <div className="px-4 pb-2">
                <p className={`text-[10px] font-black uppercase tracking-[0.22em] ${
                  isDark ? "text-slate-500" : "text-slate-400"
                }`}>Navigate</p>
              </div>

              <nav className="grid grid-cols-2 gap-2.5 px-4 pb-3">
                {navLinks.map((link) => {
                  const isActive = location.pathname === link.path;
                  const Icon = link.icon;
                  return (
                    <NavLink
                      key={link.name}
                      to={link.path}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3 rounded-2xl px-4 py-3.5 text-sm font-bold transition-all ${
                        isActive
                          ? isDark
                            ? "bg-cyan-500/15 text-cyan-300"
                            : "bg-blue-50 text-blue-700"
                          : isDark
                            ? "bg-white/5 text-slate-300"
                            : "bg-slate-50 text-slate-700"
                      }`}
                    >
                      <Icon size={18} />
                      {link.name}
                    </NavLink>
                  );
                })}
              </nav>

              <div className="px-4">
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

      {/* ── Page content ── */}
      <main className="px-3 pt-3">
        <AiSessionBanner />
        <Outlet />
      </main>

      {/* ── Minimal solid bottom tab bar ── */}
      <div
        className={`fixed-bottom-safe z-40 ${
          isDark
            ? "bg-[#0c1120]/95 border-t border-white/[0.07]"
            : "bg-white/95 border-t border-slate-200"
        }`}
        style={{ backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)" }}
      >
        <nav className="relative flex items-stretch px-2" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
          {primaryMobileLinks.map((link) => {
            const isActive = location.pathname === link.path;
            const Icon = link.icon;
            return (
              <NavLink
                key={link.path}
                to={link.path}
                className={`relative flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-bold tracking-wide transition-colors ${
                  isActive
                    ? isDark
                      ? "text-cyan-400"
                      : "text-blue-600"
                    : isDark
                      ? "text-slate-500"
                      : "text-slate-400"
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="mobile-patient-tab"
                    className={`absolute top-0 inset-x-2 h-0.5 rounded-full ${
                      isDark ? "bg-cyan-400" : "bg-blue-500"
                    }`}
                    transition={{ type: "spring", stiffness: 400, damping: 34 }}
                  />
                )}
                <motion.div whileTap={{ scale: 0.82 }} transition={{ type: "spring", stiffness: 500, damping: 25 }}>
                  <Icon size={20} strokeWidth={isActive ? 2.2 : 1.8} />
                </motion.div>
                <span>{link.name}</span>
              </NavLink>
            );
          })}

          {/* More button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen((open) => !open)}
            className={`relative flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-bold tracking-wide transition-colors ${
              mobileMenuOpen
                ? isDark ? "text-cyan-400" : "text-blue-600"
                : isDark ? "text-slate-500" : "text-slate-400"
            }`}
          >
            {mobileMenuOpen && (
              <motion.div
                layoutId="mobile-patient-tab"
                className={`absolute top-0 inset-x-2 h-0.5 rounded-full ${
                  isDark ? "bg-cyan-400" : "bg-blue-500"
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

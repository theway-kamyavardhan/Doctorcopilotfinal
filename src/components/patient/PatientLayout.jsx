import React, { useMemo, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
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
                          className={`relative flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold tracking-wide transition-all duration-300 lg:px-5 ${
                            isActive
                              ? isDark
                                ? "bg-[var(--cyan-primary)]/10 text-[var(--cyan-primary)] shadow-[inset_0_1px_0_0_rgba(6,182,212,0.2)]"
                                : "bg-blue-500/10 text-blue-700 shadow-[inset_0_1px_0_0_rgba(59,130,246,0.3)]"
                              : isDark
                                ? "text-slate-400 hover:bg-white/5 hover:text-slate-200"
                                : "text-slate-500 hover:bg-black/5 hover:text-slate-800"
                          }`}
                        >
                          <Icon size={14} className={isActive ? "opacity-100" : "opacity-70"} />
                          {link.name}
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
      className={`min-h-screen pb-28 ${
        isDark
          ? "bg-[linear-gradient(180deg,#020617,#0f172a_34%,#020617)] text-white"
          : "bg-[linear-gradient(180deg,#f8fbff,#edf4fb_42%,#f8fbff)] text-slate-900"
      }`}
    >
      <div className="sticky top-0 z-40 px-3 pt-3">
        <GlassSurface
          width="100%"
          height="auto"
          borderRadius={28}
          backgroundOpacity={isDark ? 0.34 : 0.66}
          blur={24}
          brightness={isDark ? 92 : 112}
          saturation={1.8}
          className={`border px-4 py-4 ${
            isDark ? "border-white/10 shadow-[0_14px_40px_rgba(2,6,23,0.42)]" : "border-white/80 shadow-[0_12px_30px_rgba(15,23,42,0.08)]"
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className={`text-[10px] font-black uppercase tracking-[0.26em] ${isDark ? "text-cyan-300/80" : "text-blue-700/75"}`}>
                Patient Workspace
              </div>
              <div className="mt-1 text-xl font-black tracking-tight">DoctorCopilot</div>
              <div className={`mt-1 text-xs font-semibold ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                {activeLink.name}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setMobileMenuOpen((open) => !open)}
              className={`inline-flex rounded-full p-2.5 ${isDark ? "bg-white/5 text-slate-100" : "bg-slate-100 text-slate-700"}`}
              aria-label="Toggle patient menu"
            >
              {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>

          <div className={`mt-4 rounded-[1.35rem] border px-4 py-3 ${isDark ? "border-white/8 bg-white/[0.03]" : "border-slate-200 bg-white/70"}`}>
            <div className={`text-[11px] font-black uppercase tracking-[0.22em] ${isDark ? "text-slate-500" : "text-slate-400"}`}>
              Mobile Summary
            </div>
            <p className={`mt-2 text-sm leading-6 ${isDark ? "text-slate-300" : "text-slate-600"}`}>
              Faster phone-first navigation with fewer controls per screen and direct access to reports, cases, and timeline.
            </p>
          </div>
        </GlassSurface>
      </div>

      {mobileMenuOpen ? (
        <div className="fixed inset-0 z-50 bg-slate-950/55 px-3 py-4 backdrop-blur-sm">
          <GlassSurface
            width="100%"
            height="auto"
            borderRadius={30}
            backgroundOpacity={isDark ? 0.44 : 0.84}
            blur={26}
            brightness={isDark ? 90 : 112}
            saturation={1.8}
            className={`border p-4 ${isDark ? "border-white/10 text-white" : "border-white/80 text-slate-900"}`}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className={`text-[10px] font-black uppercase tracking-[0.24em] ${isDark ? "text-cyan-300/75" : "text-blue-700/75"}`}>
                  Navigation
                </div>
                <div className="mt-1 text-lg font-black">Patient Menu</div>
              </div>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className={`rounded-full p-2 ${isDark ? "bg-white/5 text-slate-100" : "bg-slate-100 text-slate-700"}`}
              >
                <X size={18} />
              </button>
            </div>

            <nav className="mt-4 grid gap-2">
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
            </nav>

            <button
              type="button"
              onClick={handleLogout}
              className={`mt-4 flex w-full items-center justify-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold ${
                isDark ? "bg-rose-500/10 text-rose-200" : "bg-rose-100 text-rose-700"
              }`}
            >
              <LogOut size={16} />
              Sign out
            </button>
          </GlassSurface>
        </div>
      ) : null}

      <main className="px-3 pt-4">
        <div className={`rounded-[2rem] border p-3 ${isDark ? "border-white/8 bg-white/[0.03]" : "border-slate-200 bg-white/72"}`}>
          <AiSessionBanner />
          <div className="mt-3">
            <Outlet />
          </div>
        </div>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-40 px-3 pb-3">
        <GlassSurface
          width="100%"
          height="auto"
          borderRadius={26}
          backgroundOpacity={isDark ? 0.56 : 0.82}
          blur={24}
          brightness={isDark ? 92 : 112}
          saturation={1.8}
          className={`border px-2 py-2 ${isDark ? "border-white/10 shadow-[0_-14px_40px_rgba(2,6,23,0.45)]" : "border-white/80 shadow-[0_-12px_28px_rgba(15,23,42,0.1)]"}`}
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
  );
}

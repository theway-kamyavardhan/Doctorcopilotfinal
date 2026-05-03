import React, { useMemo, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
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
  User
} from "lucide-react";

import { useTheme } from "../../context/ThemeContext";
import { authService } from "../../services/auth.service";
import AmbientBackdrop from "../ui/AmbientBackdrop";
import GlassSurface from "../ui/GlassSurface";
import RefractionFilter from "../ui/RefractionFilter";

// ─── Nav configuration ──────────────────────────────────────────────────────

const NAV_LINKS = [
  { name: "Summary",   path: "/patient/dashboard", icon: LayoutDashboard },
  { name: "Timeline",  path: "/patient/timeline",  icon: History        },
  { name: "Trends",    path: "/patient/trends",    icon: TrendingUp     },
  { name: "Reports",   path: "/patient/reports",   icon: FileText       },
  { name: "Cases",     path: "/patient/cases",     icon: ClipboardList  },
  { name: "Chats",     path: "/patient/chats",     icon: MessageSquare  },
  { name: "Calendar",  path: "/patient/calendar",  icon: CalendarDays   },
  { name: "Settings",  path: "/patient/settings",  icon: Settings       },
];

// Bottom-tab primary links (shown always in mobile bar)
const PRIMARY_TABS = [NAV_LINKS[0], NAV_LINKS[1], NAV_LINKS[2], NAV_LINKS[4]];

// ─── Root layout ─────────────────────────────────────────────────────────────

export default function PatientLayout() {
    const { isDark } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const activeLink = useMemo(
    () => NAV_LINKS.find((l) => location.pathname === l.path) ?? NAV_LINKS[0],
    [location.pathname]
  );

  const handleLogout = () => {
    authService.logout();
    navigate("/login", { replace: true });
  };

  const sharedProps = {
    isDark,
    location,
    navLinks: NAV_LINKS,
    primaryMobileLinks: PRIMARY_TABS,
    activeLink,
    mobileMenuOpen,
    setMobileMenuOpen,
    handleLogout,
  };

  
  return (
    <PatientDesktopLayout
      {...sharedProps}
      etherColors={
        isDark
          ? ["#020617", "#0f172a", "#1e1b4b", "#06b6d4", "#2563eb", "#000000"]
          : ["#f8fafc", "#f1f5f9", "#e2e8f0", "#bfdbfe", "#ddd6fe", "#ffffff"]
      }
    />
  );
}

// ─── Mobile layout ────────────────────────────────────────────────────────────

function PatientMobileLayout({
  isDark,
  location,
  primaryMobileLinks,
  handleLogout,
}) {
  return (
    <div className={`min-h-[100svh] w-full font-sans antialiased overflow-x-hidden ${isDark ? "bg-black text-white" : "bg-[#F2F2F7] text-black"}`}>
      
      {/* Scrollable Main Area */}
      <main className="pb-24 w-full">
        <Outlet />
      </main>

      {/* Fixed Bottom Tab Bar - Native iOS Style */}
      <nav className={`fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around px-2 pb-[env(safe-area-inset-bottom,20px)] pt-3 backdrop-blur-2xl border-t transition-colors duration-300 ${
        isDark ? "bg-[#1C1C1E]/85 border-[#38383A]" : "bg-[#F9F9F9]/85 border-[#E5E5EA]"
      }`}>
        {primaryMobileLinks.map((link) => {
          const isActive = location.pathname.startsWith(link.path);
          const Icon = link.icon;
          return (
            <NavLink
              key={link.name}
              to={link.path}
              style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
              className={`touch-target active-feedback flex flex-col items-center gap-1.5 px-3 min-w-[64px] transition-colors ${
                isActive
                  ? (isDark ? "text-[#0A84FF]" : "text-[#007AFF]")
                  : (isDark ? "text-[#98989D]" : "text-[#8E8E93]")
              }`}
            >
              <Icon size={24} strokeWidth={isActive ? 2.5 : 2} className={isActive ? "scale-105" : ""} />
              <span className="text-[10px] font-bold tracking-tight">{link.name}</span>
            </NavLink>
          );
        })}
        {/* Profile/Menu Tab */}
        <NavLink
          to="/patient/settings"
          style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
          className={`touch-target active-feedback flex flex-col items-center gap-1.5 px-3 min-w-[64px] transition-colors ${
            location.pathname.includes('/settings')
              ? (isDark ? "text-[#0A84FF]" : "text-[#007AFF]")
              : (isDark ? "text-[#98989D]" : "text-[#8E8E93]")
          }`}
        >
          <User size={24} strokeWidth={location.pathname.includes('/settings') ? 2.5 : 2} />
          <span className="text-[10px] font-bold tracking-tight">Profile</span>
        </NavLink>
      </nav>
    </div>
  );
}

// ─── Desktop layout ───────────────────────────────────────────────────────────

function PatientDesktopLayout({
  isDark,
  location,
  navLinks,
  activeLink,
  mobileMenuOpen,
  setMobileMenuOpen,
  handleLogout,
  etherColors,
}) {
  return (
    <div className="relative min-h-screen w-full bg-[var(--bg-primary)] font-sans text-[var(--text-primary)] transition-colors duration-700" style={{ touchAction: 'pan-y' }}>
      <RefractionFilter />
      <div className="fixed inset-0 z-0 pointer-events-none select-none">
        <AmbientBackdrop palette={etherColors} opacity={isDark ? 0.38 : 0.26} className={isDark ? "mix-blend-screen" : "mix-blend-multiply"} />
      </div>
      <div className="fixed inset-0 z-[1] pointer-events-none transition-colors duration-1000" style={{ background: "radial-gradient(ellipse at center, transparent 40%, var(--vignette-color) 100%)" }} />
      <div className="relative z-10 flex min-h-screen flex-col">
        {/* ── Header ── */}
        <header className="sticky top-0 z-50 px-3 py-3 transition-all duration-300 sm:px-4 sm:py-4 md:px-6 md:py-6">
          <div className="mx-auto max-w-[1600px]">
            <GlassSurface width="100%" height="auto" borderRadius={28} backgroundOpacity={isDark ? 0.4 : 0.15} blur={28} brightness={isDark ? 90 : 110} saturation={2.5} className={`border px-4 py-4 transition-all duration-700 sm:px-5 md:px-8 ${isDark ? "border-[var(--cyan-primary)]/20 shadow-[0_4px_30px_rgba(6,182,212,0.1),inset_0_1px_0_rgba(6,182,212,0.2)]" : "border-white/50 shadow-[0_4px_30px_rgba(255,255,255,0.3),inset_0_1px_0_rgba(255,255,255,0.7)]"}`}>
              <div className="flex w-full flex-col gap-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 flex items-center gap-3">
                    <div className={`h-7 w-7 shrink-0 rounded-full bg-gradient-to-tr ${isDark ? "from-[var(--cyan-primary)] via-blue-400 to-indigo-500 shadow-[0_0_20px_var(--cyan-primary)]" : "from-blue-400 via-violet-400 to-rose-400"}`} />
                    <div className="min-w-0">
                      <span className={`block truncate text-lg font-black tracking-tight sm:text-xl ${isDark ? "text-cyan-300" : "text-slate-800"}`}>DoctorCopilot</span>
                    </div>
                  </div>
                  <nav className="hidden md:flex md:flex-1 md:flex-wrap md:items-center md:justify-center md:gap-2">
                    {navLinks.map((link) => {
                      const isActive = location.pathname === link.path;
                      const Icon = link.icon;
                      return (
                        <NavLink key={link.name} to={link.path} className={`relative flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold tracking-wide transition-all duration-300 lg:px-5 z-10 ${isActive ? isDark ? "text-[var(--cyan-primary)]" : "text-blue-700" : isDark ? "text-slate-400 hover:bg-white/5 hover:text-slate-200" : "text-slate-500 hover:bg-black/5 hover:text-slate-800"}`}>
                          {isActive && <motion.div layoutId="desktop-patient-nav-active" className={`absolute inset-0 rounded-full -z-10 ${isDark ? "bg-[var(--cyan-primary)]/10 shadow-[inset_0_1px_0_0_rgba(6,182,212,0.2)]" : "bg-blue-500/10 shadow-[inset_0_1px_0_0_rgba(59,130,246,0.3)]"}`} transition={{ type: "spring", stiffness: 350, damping: 30 }} />}
                          <Icon size={14} className={isActive ? "opacity-100" : "opacity-70"} />
                          <span>{link.name}</span>
                        </NavLink>
                      );
                    })}
                  </nav>
                  <div className="flex items-center gap-2 sm:gap-4">
                    <div className={`hidden items-center gap-2 rounded-full border px-4 py-1.5 backdrop-blur-md lg:flex ${isDark ? "border-white/10 bg-slate-900/50" : "border-slate-200 bg-white/50"}`}>
                      <Search size={14} className={isDark ? "text-slate-400" : "text-slate-500"} />
                      <input type="text" placeholder="Search reports..." className="w-32 bg-transparent border-none text-xs outline-none transition-all duration-300 placeholder:opacity-50 focus:w-48" />
                    </div>
                    <button type="button" onClick={handleLogout} className="hidden rounded-full p-2 transition-colors duration-300 hover:bg-red-500/10 hover:text-red-500 md:inline-flex">
                      <LogOut size={18} className="opacity-70" />
                    </button>
                    <button type="button" onClick={() => setMobileMenuOpen(o => !o)} className={`inline-flex rounded-full p-2 md:hidden ${isDark ? "bg-white/5 text-slate-200" : "bg-slate-100 text-slate-700"}`}>
                      {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
                    </button>
                  </div>
                </div>
              </div>
            </GlassSurface>
          </div>
        </header>
        <main className="relative flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

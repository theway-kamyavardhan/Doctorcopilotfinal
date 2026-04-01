import React, { useEffect, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  CalendarDays,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  Settings,
  Stethoscope,
} from "lucide-react";
import { useTheme } from "../../context/ThemeContext";
import { authService } from "../../services/auth.service";
import GlassSurface from "../ui/GlassSurface";
import { getDoctorProfile } from "../../services/doctor.service";

const NAV_ITEMS = [
  { name: "Dashboard", path: "/doctor/dashboard", icon: LayoutDashboard },
  { name: "Cases", path: "/doctor/cases", icon: Stethoscope },
  { name: "Chats", path: "/doctor/chats", icon: MessageSquare },
  { name: "Calendar", path: "/doctor/calendar", icon: CalendarDays },
  { name: "Settings", path: "/doctor/settings", icon: Settings },
];

export default function DoctorLayout() {
  const { isDark } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [doctorName, setDoctorName] = useState("Doctor Workspace");
  const [doctorMeta, setDoctorMeta] = useState("Authenticated doctor session");

  useEffect(() => {
    let mounted = true;

    getDoctorProfile()
      .then((profile) => {
        if (!mounted) return;
        setDoctorName(profile?.user?.full_name || "Doctor Workspace");
        setDoctorMeta(
          [profile?.specialization, profile?.hospital].filter(Boolean).join(" • ") ||
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

  return (
    <div
      className={`min-h-screen px-4 py-5 md:px-6 ${
        isDark
          ? "bg-[radial-gradient(circle_at_top,rgba(99,102,241,0.12),transparent_20%),linear-gradient(180deg,#030712,#0b1120_60%,#030712)]"
          : "bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.12),transparent_18%),linear-gradient(180deg,#f8fbff,#edf4fb_60%,#f8fbff)]"
      }`}
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-5">
        <GlossyHeader
          isDark={isDark}
          location={location}
          handleLogout={handleLogout}
          doctorName={doctorName}
          doctorMeta={doctorMeta}
        />
        <GlossyMain isDark={isDark} location={location} />
      </div>
    </div>
  );
}

function GlossyHeader({ isDark, location, handleLogout, doctorName, doctorMeta }) {
  return (
    <GlassSurface
      width="100%"
      height="auto"
      borderRadius={32}
      backgroundOpacity={isDark ? 0.3 : 0.15}
      blur={40}
      brightness={isDark ? 110 : 120}
      saturation={2.5}
      className={`border px-5 py-4 transition-all duration-700 lg:py-5 ${
        isDark
          ? "border-[var(--cyan-primary)]/20 text-white shadow-[0_8px_40px_rgba(6,182,212,0.12),inset_0_1px_0_rgba(6,182,212,0.2)]"
          : "border-white/50 text-slate-900 shadow-[0_8px_40px_rgba(30,58,138,0.06),inset_0_1px_0_rgba(255,255,255,0.8)]"
      }`}
    >
      <div className="relative z-10 flex h-full w-full flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4">
          <div className={`h-10 w-10 shrink-0 rounded-2xl bg-gradient-to-tr ${
            isDark
              ? "from-[var(--gold-primary)] via-amber-200 to-[var(--gold-soft)] shadow-[0_0_20px_var(--gold-primary)]"
              : "from-blue-400 via-violet-400 to-rose-400 shadow-[0_0_16px_rgba(30,58,138,0.2)]"
          }`} />
          <div>
            <div className={`text-[10px] font-black uppercase tracking-[0.26em] ${isDark ? "text-cyan-300/80" : "text-blue-700/75"}`}>
              Doctor Workspace
            </div>
            <h1 className={`mt-0.5 text-2xl font-black tracking-tighter ${isDark ? "bg-[var(--gold-metallic)] bg-clip-text text-transparent" : "text-slate-800"}`}>
              {doctorName}
            </h1>
            <p className={`mt-1 text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>{doctorMeta}</p>
          </div>
        </div>

        <nav className="flex flex-wrap items-center gap-1.5 md:gap-2">
          {NAV_ITEMS.map((item) => {
            const isActive = location.pathname.startsWith(item.path);
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`group relative inline-flex items-center gap-2 overflow-hidden rounded-full px-4 py-2.5 text-[13px] font-bold transition-all ${
                  isActive
                    ? isDark
                      ? "border border-cyan-400/30 bg-cyan-500/20 text-cyan-200 shadow-[0_0_20px_rgba(6,182,212,0.15)]"
                      : "border border-blue-200 bg-blue-100 text-blue-700 shadow-sm"
                    : isDark
                      ? "border border-transparent text-slate-300 hover:bg-white/[0.08] hover:text-white"
                      : "border border-transparent text-slate-600 hover:bg-white/60 hover:text-slate-900"
                }`}
              >
                {isActive ? (
                  <span className="absolute inset-0 -translate-x-[100%] bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-1000 group-hover:translate-x-[100%]" />
                ) : null}
                <Icon size={16} className={isActive ? (isDark ? "text-cyan-300" : "text-blue-600") : "opacity-70"} />
                {item.name}
              </Link>
            );
          })}

          <div className={`mx-1 h-8 w-px ${isDark ? "bg-white/10" : "bg-slate-300/50"}`} />

          <button
            type="button"
            onClick={handleLogout}
            className={`inline-flex items-center gap-2 rounded-full border border-transparent px-4 py-2.5 text-[13px] font-bold transition-all ${
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
      initial={{ opacity: 0, y: 16, filter: "blur(10px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="w-full flex-1"
    >
      <GlassSurface
        width="100%"
        height="100%"
        borderRadius={32}
        backgroundOpacity={isDark ? 0.25 : 0.4}
        blur={50}
        brightness={isDark ? 95 : 120}
        saturation={1.5}
        className={`border p-5 transition-all duration-700 md:p-8 ${
          isDark
            ? "border-white/10 text-white shadow-[0_24px_80px_rgba(2,6,23,0.32),inset_0_1px_0_rgba(255,255,255,0.05)]"
            : "border-white/60 text-slate-900 shadow-[0_20px_80px_rgba(15,23,42,0.06),inset_0_1px_0_rgba(255,255,255,1)]"
        }`}
      >
        <div className="relative z-10">
          <Outlet />
        </div>
      </GlassSurface>
    </motion.main>
  );
}

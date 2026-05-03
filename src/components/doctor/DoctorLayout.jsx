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
import { getDoctorProfile } from "../../services/doctor.service";
import GlassSurface from "../ui/GlassSurface";
import AiSessionBanner from "../ui/AiSessionBanner";

// ─── Nav configuration ───────────────────────────────────────────────────────

const NAV_ITEMS = [
  { name: "Dashboard", path: "/doctor/dashboard", icon: LayoutDashboard },
  { name: "Cases",     path: "/doctor/cases",     icon: Stethoscope     },
  { name: "Chats",     path: "/doctor/chats",     icon: MessageSquare   },
  { name: "Calendar",  path: "/doctor/calendar",  icon: CalendarDays    },
  { name: "Settings",  path: "/doctor/settings",  icon: Settings        },
];

const PRIMARY_TABS = NAV_ITEMS.slice(0, 4);

// ─── Root layout ─────────────────────────────────────────────────────────────

export default function DoctorLayout() {
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
    return () => { mounted = false; };
  }, []);

  const handleLogout = () => {
    authService.logout();
    navigate("/login");
  };

  const sharedProps = {
    isDark,
    location,
    handleLogout,
    doctorName,
    doctorMeta,
    mobileMenuOpen,
    setMobileMenuOpen,
  };

  

  return (
    <div
      className={`min-h-screen px-3 py-3 sm:px-4 sm:py-4 md:px-6 md:py-5 ${
        isDark
          ? "bg-[radial-gradient(circle_at_top,rgba(99,102,241,0.12),transparent_20%),linear-gradient(180deg,#030712,#0b1120_60%,#030712)]"
          : "bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.12),transparent_18%),linear-gradient(180deg,#f8fbff,#edf4fb_60%,#f8fbff)]"
      }`}
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-4 sm:gap-5">
        <GlossyHeader {...sharedProps} />
        <GlossyMain isDark={isDark} location={location} />
      </div>
    </div>
  );
}


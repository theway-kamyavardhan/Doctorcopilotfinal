import React, { useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import GlassSurface from '../ui/GlassSurface';
import RefractionFilter from '../ui/RefractionFilter';
import LiquidEther from '../ui/LiquidEther';
import { LayoutDashboard, TrendingUp, FileText, ClipboardList, MessageSquare, LogOut, Search, History, Settings, CalendarDays } from 'lucide-react';
import { authService } from '../../services/auth.service';

export default function PatientLayout() {
  const { isDark } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();

  const navLinks = [
    { name: 'Dashboard', path: '/patient/dashboard', icon: LayoutDashboard },
    { name: 'Timeline', path: '/patient/timeline', icon: History },
    { name: 'Calendar', path: '/patient/calendar', icon: CalendarDays },
    { name: 'Trends', path: '/patient/trends', icon: TrendingUp },
    { name: 'Reports', path: '/patient/reports', icon: FileText },
    { name: 'Your Cases', path: '/patient/cases', icon: ClipboardList },
    { name: 'Chats', path: '/patient/chats', icon: MessageSquare },
    { name: 'Settings', path: '/patient/settings', icon: Settings },
  ];

  // Subtle ether background for the patient dashboard
  const etherColors = isDark 
    ? ["#020617", "#0f172a", "#1e1b4b", "#06b6d4", "#2563eb", "#000000"]
    : ["#f8fafc", "#f1f5f9", "#e2e8f0", "#bfdbfe", "#ddd6fe", "#ffffff"];

  const handleLogout = () => {
    authService.logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[var(--bg-primary)] text-[var(--text-primary)] font-sans transition-colors duration-700">
      <RefractionFilter />
      
      {/* ── BACKGROUND: SUBTLE LIQUID ── */}
      <div className="fixed inset-0 z-0 pointer-events-none select-none">
        <LiquidEther
          colors={etherColors}
          mouseForce={15}
          isViscous
          viscous={18}
          resolution={0.3} // lower resolution for more subtle effect
          autoDemo
          autoSpeed={0.3}
          autoIntensity={1.5}
          className={`h-full w-full ${isDark ? 'mix-blend-screen opacity-30' : 'mix-blend-multiply opacity-20'}`}
        />
      </div>
      
      {/* Vignette */}
      <div className="fixed inset-0 z-[1] pointer-events-none transition-colors duration-1000" 
           style={{ background: `radial-gradient(ellipse at center, transparent 40%, var(--vignette-color) 100%)` }} />

      <div className="relative z-10 flex min-h-screen flex-col">
        {/* ── NAVBAR (GLASS) ── */}
        <header className="sticky top-0 z-50 px-6 py-6 transition-all duration-300">
          <div className="mx-auto max-w-[1600px]">
            <GlassSurface
              width="100%"
              height="68px"
              borderRadius={34}
              backgroundOpacity={isDark ? 0.4 : 0.15}
              blur={28}
              brightness={isDark ? 90 : 110}
              saturation={2.5}
              className={`px-8 border transition-all duration-700 ${isDark ? 'border-[var(--cyan-primary)]/20 shadow-[0_4px_30px_rgba(6,182,212,0.1),inset_0_1px_0_rgba(6,182,212,0.2)]' : 'border-white/50 shadow-[0_4px_30px_rgba(255,255,255,0.3),inset_0_1px_0_rgba(255,255,255,0.7)]'}`}
            >
              <div className="flex w-full items-center justify-between">
                
                {/* Brand */}
                <div className="flex items-center gap-3">
                  <div className={`h-7 w-7 rounded-full bg-gradient-to-tr ${isDark ? 'from-[var(--cyan-primary)] via-blue-400 to-indigo-500 shadow-[0_0_20px_var(--cyan-primary)]' : 'from-blue-400 via-violet-400 to-rose-400'}`} />
                  <span className={`text-xl font-black tracking-tight ${isDark ? 'text-transparent bg-clip-text bg-[var(--cyan-primary)]' : 'text-slate-800'}`}>DoctorCopilot</span>
                </div>

                {/* Desk Navigation */}
                <nav className="hidden md:flex items-center gap-2">
                  {navLinks.map((link) => {
                    const isActive = location.pathname === link.path;
                    return (
                      <NavLink
                        key={link.name}
                        to={link.path}
                        className={`
                          relative px-5 py-2 rounded-full text-xs font-bold tracking-wide transition-all duration-300 flex items-center gap-2
                          ${isActive 
                            ? (isDark ? 'text-[var(--cyan-primary)] bg-[var(--cyan-primary)]/10 shadow-[inset_0_1px_0_0_rgba(6,182,212,0.2)]' : 'text-blue-700 bg-blue-500/10 shadow-[inset_0_1px_0_0_rgba(59,130,246,0.3)]')
                            : (isDark ? 'text-slate-400 hover:text-slate-200 hover:bg-white/5' : 'text-slate-500 hover:text-slate-800 hover:bg-black/5')
                          }
                        `}
                      >
                        <link.icon size={14} className={isActive ? 'opacity-100' : 'opacity-70'} />
                        {link.name}
                      </NavLink>
                    );
                  })}
                </nav>

                {/* Right Actions */}
                <div className="flex items-center gap-4">
                  <div className={`hidden md:flex items-center gap-2 px-4 py-1.5 rounded-full border ${isDark ? 'bg-slate-900/50 border-white/10' : 'bg-white/50 border-slate-200'} backdrop-blur-md`}>
                    <Search size={14} className={isDark ? 'text-slate-400' : 'text-slate-500'} />
                    <input 
                      type="text" 
                      placeholder="Search reports..." 
                      className="bg-transparent border-none outline-none text-xs w-32 focus:w-48 transition-all duration-300 placeholder:opacity-50"
                    />
                  </div>
                  
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="p-2 rounded-full transition-colors duration-300 hover:bg-red-500/10 hover:text-red-500 group"
                  >
                    <LogOut size={18} className="opacity-70 group-hover:opacity-100 transition-opacity" />
                  </button>
                </div>
              </div>
            </GlassSurface>
          </div>
        </header>

        {/* ── PAGE CONTENT ── */}
        <main className="flex-1 w-full max-w-[1600px] mx-auto px-6 py-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

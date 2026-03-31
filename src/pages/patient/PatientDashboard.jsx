import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '../../context/ThemeContext';
import GlassSurface from '../../components/ui/GlassSurface';
import { authService } from '../../services/auth.service';
import { Calendar, Clock, MapPin, TrendingUp, TrendingDown, Minus, Activity, Droplet, HeartPulse, BrainCircuit, ChevronRight, User, AlertCircle, Info } from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer, YAxis } from 'recharts';

export default function PatientDashboard() {
  const { isDark } = useTheme();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const data = await authService.getPatientProfile();
        setProfile(data);
      } catch (err) {
        console.error('Failed to fetch patient profile:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  // ── INLINE DATA ──
  const upcomingAppointment = {
    doctor: "Dr. Elena Thorne",
    specialty: "Systems Biologist",
    date: "April 15, 2026",
    time: "10:30 AM",
    location: "Stellar Integrated Health, Room 402"
  };

  const healthSignals = [
    { name: "Hemoglobin", value: "14.2", unit: "g/dL", status: "Optimal", trend: "up", icon: Droplet, color: "text-rose-500", bg: "bg-rose-500/10" },
    { name: "Vitamin D", value: "24", unit: "ng/mL", status: "Low", trend: "down", icon: Activity, color: "text-amber-500", bg: "bg-amber-500/10" },
    { name: "Heart Rate", value: "68", unit: "bpm", status: "Stable", trend: "flat", icon: HeartPulse, color: "text-emerald-500", bg: "bg-emerald-500/10" }
  ];

  const timelineData = [
    { date: "Oct", value: 12.8 },
    { date: "Nov", value: 13.5 },
    { date: "Dec", value: 13.8 },
    { date: "Jan", value: 14.0 },
    { date: "Feb", value: 14.1 },
    { date: "Mar", value: 14.2 }
  ];

  // Micro-interaction variants
  const cardHover = {
    rest: { y: 0, scale: 1, boxShadow: "0px 4px 20px rgba(0,0,0,0)" },
    hover: { y: -4, scale: 1.01, boxShadow: isDark ? "0px 10px 30px rgba(6,182,212,0.1)" : "0px 10px 30px rgba(0,0,0,0.05)" }
  };

  const RenderTrendIcon = ({ trend }) => {
    switch(trend) {
      case 'up': return <TrendingUp size={14} className="text-emerald-500" />;
      case 'down': return <TrendingDown size={14} className="text-rose-500" />;
      default: return <Minus size={14} className="text-slate-400" />;
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-1000 max-w-6xl mx-auto pt-6 pb-20">
      
      {/* ── 1. HEADER & HEALTH CORE ── */}
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className={`text-4xl md:text-5xl font-black tracking-tight mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            Good morning, {profile?.user?.full_name?.split(' ')[0] || 'Subject'}.
          </h1>
          <p className={`text-lg font-medium tracking-wide ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Your systems are synchronized.
          </p>
        </div>
        
        {/* Health Core Indicator */}
        <div className={`flex items-center gap-4 px-6 py-3 rounded-full border backdrop-blur-md ${isDark ? 'bg-slate-900/50 border-cyan-500/20 shadow-[0_0_20px_rgba(6,182,212,0.1)]' : 'bg-white/80 border-slate-200 shadow-sm'}`}>
          <div className="relative flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-4 w-4 bg-cyan-500 border-2 border-slate-900"></span>
          </div>
          <div>
            <div className={`text-[0.65rem] font-black uppercase tracking-[0.2em] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>System Integrity</div>
            <div className={`text-sm font-bold ${isDark ? 'text-cyan-400' : 'text-blue-600'}`}>92% • Optimal</div>
          </div>
        </div>
      </section>

      {/* ── 2. MAIN GRID ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN (Appointments & Insights) */}
        <div className="lg:col-span-5 space-y-6 flex flex-col">
          
          {/* Upcoming Appointment */}
          <div className="space-y-3 flex-1">
            <h2 className={`text-[0.65rem] font-black uppercase tracking-[0.3em] ${isDark ? 'text-slate-500' : 'text-slate-400'} ml-2`}>
              Next Scheduled Visit
            </h2>
            <motion.div initial="rest" whileHover="hover" variants={cardHover} className="h-full">
              <GlassSurface
                width="100%"
                height="100%"
                borderRadius={32}
                backgroundOpacity={isDark ? 0.2 : 0.7}
                className={`p-8 border h-full flex flex-col justify-between ${isDark ? 'border-white/10' : 'border-white/60 shadow-xl'}`}
              >
                <div>
                  <div className="flex items-start justify-between mb-8">
                    <div className={`p-4 rounded-2xl ${isDark ? 'bg-cyan-500/20 text-cyan-400' : 'bg-blue-500/10 text-blue-600'}`}>
                      <Calendar size={32} strokeWidth={1.5} />
                    </div>
                    <div className="flex items-center gap-2">
                       <span className="relative flex h-2 w-2">
                         <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                         <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                       </span>
                       <span className={`text-xs font-bold tracking-widest uppercase ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                         Confirmed
                       </span>
                    </div>
                  </div>
                  
                  <div className="space-y-1 mb-6">
                    <h3 className={`text-3xl font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      {upcomingAppointment.doctor}
                    </h3>
                    <p className={`text-sm font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      {upcomingAppointment.specialty}
                    </p>
                  </div>
                </div>

                <div className={`space-y-3 pt-6 border-t ${isDark ? 'border-white/10' : 'border-slate-200/50'}`}>
                  <div className="flex items-center gap-3">
                    <Clock size={16} className={isDark ? 'text-slate-500' : 'text-slate-400'} />
                    <span className={`text-sm font-bold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                      {upcomingAppointment.date} • {upcomingAppointment.time}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <MapPin size={16} className={isDark ? 'text-slate-500' : 'text-slate-400'} />
                    <span className={`text-sm font-bold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                      {upcomingAppointment.location}
                    </span>
                  </div>
                </div>
              </GlassSurface>
            </motion.div>
          </div>

          {/* AI Insight Panel */}
          <motion.div initial="rest" whileHover="hover" variants={cardHover}>
            <GlassSurface
               width="100%"
               borderRadius={24}
               backgroundOpacity={isDark ? 0.3 : 0.6}
               className={`p-6 border relative overflow-hidden ${isDark ? 'border-cyan-500/30 bg-gradient-to-br from-cyan-500/5 to-transparent' : 'border-blue-200 bg-blue-50/50 shadow-lg'}`}
            >
               <div className="absolute top-0 left-0 w-1 h-full bg-cyan-500" />
               <div className="flex items-start gap-4">
                  <div className={`p-2 rounded-lg ${isDark ? 'bg-cyan-500/20 text-cyan-400' : 'bg-blue-100 text-blue-600'}`}>
                     <BrainCircuit size={20} />
                  </div>
                  <div>
                     <h3 className={`text-xs font-black uppercase tracking-[0.2em] mb-1 ${isDark ? 'text-cyan-400' : 'text-blue-600'}`}>System Insight</h3>
                     <p className={`text-sm leading-relaxed font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                       Vitamin D levels remain below optimal thresholds. A minor adjustment to your D3 supplementation protocol is recommended before the winter phase.
                     </p>
                  </div>
               </div>
            </GlassSurface>
          </motion.div>

          {/* Genetic Profile & Medical Notes (New) */}
          {profile?.medical_history && (
            <motion.div initial="rest" whileHover="hover" variants={cardHover}>
              <GlassSurface
                width="100%"
                borderRadius={24}
                backgroundOpacity={isDark ? 0.2 : 0.7}
                className={`p-6 border ${isDark ? 'border-white/10' : 'border-white shadow-lg'}`}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className={`p-2 rounded-lg ${isDark ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-600'}`}>
                    <AlertCircle size={20} />
                  </div>
                  <h3 className={`text-xs font-black uppercase tracking-[0.2em] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Genetic Profile & Medical Notes</h3>
                </div>
                <div className={`p-4 rounded-xl text-sm font-medium leading-relaxed ${isDark ? 'bg-white/5 border border-white/5 text-slate-300' : 'bg-slate-50 border border-slate-100 text-slate-700'}`}>
                  {profile.medical_history}
                </div>
              </GlassSurface>
            </motion.div>
          )}

        </div>

        {/* RIGHT COLUMN (Health Signals & Timeline) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Health Signals */}
          <div className="space-y-3">
            <div className="flex items-center justify-between ml-2">
              <h2 className={`text-[0.65rem] font-black uppercase tracking-[0.3em] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                Health Signals
              </h2>
              <button className={`text-[0.65rem] uppercase font-black tracking-widest transition-colors flex items-center gap-1 ${isDark ? 'text-cyan-400 hover:text-cyan-300' : 'text-blue-600 hover:text-blue-500'}`}>
                See All <ChevronRight size={12} />
              </button>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {healthSignals.map((signal, i) => (
                <motion.div key={i} initial="rest" whileHover="hover" variants={cardHover}>
                  <GlassSurface
                    width="100%"
                    height="auto"
                    borderRadius={24}
                    backgroundOpacity={isDark ? 0.2 : 0.6}
                    className={`p-5 border ${isDark ? 'border-white/5' : 'border-white/40 shadow-md'}`}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className={`p-2 rounded-xl ${signal.bg} ${signal.color}`}>
                        <signal.icon size={18} className="opacity-90" strokeWidth={2} />
                      </div>
                      {/* Status Dot */}
                      <div className={`h-2 w-2 rounded-full ${signal.status === 'Low' ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]' : 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]'}`} />
                    </div>
                    
                    <span className={`block text-[0.65rem] font-black uppercase tracking-widest mb-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      {signal.name}
                    </span>
                    
                    <div className="flex items-end gap-1 mb-3">
                      <span className={`text-2xl font-black tracking-tighter leading-none ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        {signal.value}
                      </span>
                      <span className={`text-xs font-bold mb-0.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                        {signal.unit}
                      </span>
                    </div>

                    <div className={`flex items-center gap-1.5 text-xs font-bold pt-3 border-t ${isDark ? 'border-white/5 text-slate-300' : 'border-slate-200 text-slate-600'}`}>
                      <RenderTrendIcon trend={signal.trend} />
                      {signal.status}
                    </div>
                  </GlassSurface>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Timeline Preview */}
          <div className="space-y-3 pt-2">
            <h2 className={`text-[0.65rem] font-black uppercase tracking-[0.3em] ${isDark ? 'text-slate-500' : 'text-slate-400'} ml-2`}>
              Hemoglobin Trajectory (6 Months)
            </h2>
            <motion.div initial="rest" whileHover="hover" variants={cardHover}>
              <GlassSurface
                 width="100%"
                 height="240px"
                 borderRadius={32}
                 backgroundOpacity={isDark ? 0.2 : 0.6}
                 className={`p-6 border flex flex-col ${isDark ? 'border-white/10' : 'border-white/60 shadow-xl'}`}
              >
                 <div className="flex-1 w-full h-full relative -ml-4 -mr-2">
                    <ResponsiveContainer width="100%" height="100%">
                       <AreaChart data={timelineData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                         <defs>
                           <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                             <stop offset="5%" stopColor={isDark ? "#06b6d4" : "#3b82f6"} stopOpacity={0.4}/>
                             <stop offset="95%" stopColor={isDark ? "#06b6d4" : "#3b82f6"} stopOpacity={0}/>
                           </linearGradient>
                         </defs>
                         <YAxis domain={['dataMin - 0.5', 'dataMax + 0.5']} hide />
                         <Area 
                           type="monotone" 
                           dataKey="value" 
                           stroke={isDark ? "#06b6d4" : "#3b82f6"} 
                           strokeWidth={3}
                           fillOpacity={1} 
                           fill="url(#colorValue)" 
                         />
                       </AreaChart>
                    </ResponsiveContainer>
                    {/* Fake X-Axis Labels for aesthetic */}
                    <div className={`absolute bottom-0 left-6 right-2 flex justify-between text-[0.6rem] font-black uppercase tracking-widest opacity-40 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                       <span>Oct</span>
                       <span>Nov</span>
                       <span>Dec</span>
                       <span>Jan</span>
                       <span>Feb</span>
                       <span>Mar</span>
                    </div>
                 </div>
              </GlassSurface>
            </motion.div>
          </div>

        </div>
      </div>
    </div>
  );
}

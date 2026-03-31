export function getAdminTheme(isDark) {
  return {
    shell: isDark
      ? "min-h-screen bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.12),_transparent_24%),radial-gradient(circle_at_bottom_right,_rgba(16,185,129,0.08),_transparent_22%),#0A0F1C] px-4 py-6 text-white md:px-6"
      : "min-h-screen bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.08),_transparent_24%),radial-gradient(circle_at_bottom_right,_rgba(16,185,129,0.04),_transparent_22%),#f8fafc] px-4 py-6 text-slate-900 md:px-6",
    surface: isDark
      ? "rounded-[2rem] border border-white/5 bg-white/[0.02] backdrop-blur-3xl shadow-[0_24px_80px_rgba(0,0,0,0.45)]"
      : "rounded-[2rem] border border-slate-200/40 bg-white/70 backdrop-blur-3xl shadow-[0_8px_40px_rgba(15,23,42,0.04)]",
    surfaceMuted: isDark
      ? "rounded-[2rem] border border-white/5 bg-white/[0.01] backdrop-blur-2xl shadow-[0_18px_60px_rgba(0,0,0,0.35)]"
      : "rounded-[2rem] border border-slate-200/30 bg-white/50 backdrop-blur-2xl shadow-[0_8px_30px_rgba(15,23,42,0.03)]",
    insetSurface: isDark
      ? "rounded-[1.5rem] border border-white/5 bg-white/[0.03] backdrop-blur-xl"
      : "rounded-[1.5rem] border border-slate-200/40 bg-slate-50/50 backdrop-blur-xl",
    headerSurface: isDark
      ? "rounded-[2rem] border border-white/5 bg-white/[0.03] backdrop-blur-3xl shadow-[0_28px_90px_rgba(0,0,0,0.45)]"
      : "rounded-[2rem] border border-slate-200/40 bg-white/80 backdrop-blur-3xl shadow-[0_12px_50px_rgba(15,23,42,0.05)]",
    title: isDark ? "text-white" : "text-slate-800",
    body: isDark ? "text-gray-400" : "text-slate-500",
    eyebrow: isDark
      ? "text-[11px] font-black uppercase tracking-[0.2em] text-cyan-300/80"
      : "text-[11px] font-black uppercase tracking-[0.2em] text-slate-500",
    input: isDark
      ? "w-full rounded-2xl border border-white/10 bg-[#0D1424]/90 px-4 py-3 text-sm text-white outline-none placeholder:text-gray-500 transition-all duration-300 focus:border-cyan-400/40 focus:bg-[#10192D]"
      : "w-full rounded-2xl border border-slate-300/60 bg-white/90 px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 transition-all duration-300 focus:border-blue-500/50 focus:bg-white shadow-[inset_0_2px_4px_rgba(15,23,42,0.02)]",
    textArea: isDark
      ? "w-full rounded-2xl border border-white/10 bg-[#0D1424]/90 px-4 py-3 text-sm text-white outline-none placeholder:text-gray-500 transition-all duration-300 focus:border-cyan-400/40 focus:bg-[#10192D]"
      : "w-full rounded-2xl border border-slate-300/60 bg-white/90 px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 transition-all duration-300 focus:border-blue-500/50 focus:bg-white shadow-[inset_0_2px_4px_rgba(15,23,42,0.02)]",
    ghostButton: isDark
      ? "rounded-2xl border border-white/10 bg-white/5 px-4 py-3 font-bold text-white transition-all duration-300 hover:scale-[1.02] hover:bg-white/10"
      : "rounded-2xl border border-slate-200 bg-white px-4 py-3 font-bold text-slate-700 transition-all duration-300 hover:scale-[1.02] hover:bg-slate-50 shadow-[0_2px_8px_rgba(15,23,42,0.04)]",
    accentButton: isDark
      ? "inline-flex items-center gap-2 rounded-2xl border border-cyan-400/20 bg-cyan-500/15 px-4 py-3 font-bold text-cyan-50 shadow-[0_12px_30px_rgba(34,211,238,0.15)] transition-all duration-300 hover:scale-[1.02] hover:bg-cyan-500/22"
      : "inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 font-bold text-white shadow-[0_12px_30px_rgba(37,99,235,0.25)] transition-all duration-300 hover:scale-[1.02] hover:bg-blue-500",
    dangerButton: isDark
      ? "rounded-2xl bg-rose-600 px-4 py-3 font-bold text-white shadow-[0_14px_34px_rgba(244,63,94,0.25)] transition-all duration-300 hover:scale-[1.02] hover:bg-rose-500"
      : "rounded-2xl bg-rose-600 px-4 py-3 font-bold text-white shadow-[0_14px_34px_rgba(244,63,94,0.25)] transition-all duration-300 hover:scale-[1.02] hover:bg-rose-500",
  };
}

export function getAdminStatTone(tone = "default", isDark) {
  const tonesDark = {
    healthy: "border-transparent bg-white/[0.04] text-emerald-100",
    warning: "border-transparent bg-white/[0.04] text-amber-50",
    critical: "border-transparent bg-white/[0.04] text-rose-50",
    accent: "border-transparent bg-white/[0.04] text-violet-50",
    default: "border-transparent bg-white/[0.02] text-white",
  };

  const tonesLight = {
    healthy: "border-transparent bg-white/60 text-emerald-800 shadow-[0_4px_20px_rgba(15,23,42,0.02)]",
    warning: "border-transparent bg-white/60 text-amber-800 shadow-[0_4px_20px_rgba(15,23,42,0.02)]",
    critical: "border-transparent bg-white/60 text-rose-800 shadow-[0_4px_20px_rgba(15,23,42,0.02)]",
    accent: "border-transparent bg-white/60 text-indigo-800 shadow-[0_4px_20px_rgba(15,23,42,0.02)]",
    default: "border-transparent bg-white/50 text-slate-800 shadow-[0_4px_20px_rgba(15,23,42,0.02)]",
  };

  return isDark ? (tonesDark[tone] || tonesDark.default) : (tonesLight[tone] || tonesLight.default);
}

export function getAdminStatusTone(value, isDark) {
  const normalized = String(value || "").toLowerCase();
  const isHealthy = normalized.includes("healthy") || normalized.includes("online") || normalized.includes("connected") || normalized.includes("processed") || normalized.includes("success") || normalized.includes("ready") || normalized.includes("active");
  const isWarning = normalized.includes("warning") || normalized.includes("pending") || normalized.includes("processing") || normalized.includes("open") || normalized.includes("busy") || normalized.includes("degraded") || normalized.includes("review");

  if (isHealthy) {
    return isDark ? "border-emerald-400/20 bg-emerald-500/15 text-emerald-100" : "border-emerald-200 bg-emerald-100 text-emerald-700";
  }
  if (isWarning) {
    return isDark ? "border-amber-400/20 bg-amber-500/15 text-amber-50" : "border-amber-200 bg-amber-100 text-amber-700";
  }
  return isDark ? "border-rose-400/20 bg-rose-500/15 text-rose-50" : "border-rose-200 bg-rose-100 text-rose-700";
}

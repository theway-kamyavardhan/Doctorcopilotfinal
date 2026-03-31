export const adminTheme = {
  shell:
    "min-h-screen bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.12),_transparent_24%),radial-gradient(circle_at_bottom_right,_rgba(16,185,129,0.08),_transparent_22%),#0A0F1C] px-4 py-6 text-white md:px-6",
  surface:
    "rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-[0_24px_80px_rgba(0,0,0,0.45)]",
  surfaceMuted:
    "rounded-2xl border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] backdrop-blur-xl shadow-[0_18px_60px_rgba(0,0,0,0.35)]",
  insetSurface:
    "rounded-2xl border border-white/10 bg-[#0D1424]/85 backdrop-blur-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]",
  headerSurface:
    "rounded-2xl border border-white/10 bg-[linear-gradient(135deg,rgba(34,211,238,0.08),rgba(255,255,255,0.04),rgba(16,185,129,0.05))] backdrop-blur-xl shadow-[0_28px_90px_rgba(0,0,0,0.45)]",
  title: "text-white",
  body: "text-gray-400",
  eyebrow: "text-[11px] font-black uppercase tracking-[0.3em] text-cyan-300/90",
  input:
    "w-full rounded-2xl border border-white/10 bg-[#0D1424]/90 px-4 py-3 text-sm text-white outline-none placeholder:text-gray-500 transition-all duration-300 focus:border-cyan-400/40 focus:bg-[#10192D]",
  textArea:
    "w-full rounded-2xl border border-white/10 bg-[#0D1424]/90 px-4 py-3 text-sm text-white outline-none placeholder:text-gray-500 transition-all duration-300 focus:border-cyan-400/40 focus:bg-[#10192D]",
  ghostButton:
    "rounded-2xl border border-white/10 bg-white/5 px-4 py-3 font-bold text-white transition-all duration-300 hover:scale-[1.02] hover:bg-white/10",
  accentButton:
    "inline-flex items-center gap-2 rounded-2xl border border-cyan-400/20 bg-cyan-500/15 px-4 py-3 font-bold text-cyan-50 shadow-[0_12px_30px_rgba(34,211,238,0.15)] transition-all duration-300 hover:scale-[1.02] hover:bg-cyan-500/22",
  dangerButton:
    "rounded-2xl bg-rose-600 px-4 py-3 font-bold text-white shadow-[0_14px_34px_rgba(244,63,94,0.25)] transition-all duration-300 hover:scale-[1.02] hover:bg-rose-500",
};

export function getAdminStatTone(tone = "default") {
  const tones = {
    healthy:
      "border-emerald-400/20 bg-[linear-gradient(135deg,rgba(16,185,129,0.18),rgba(6,182,212,0.08))] text-emerald-100 shadow-[0_18px_50px_rgba(16,185,129,0.14)]",
    warning:
      "border-amber-400/20 bg-[linear-gradient(135deg,rgba(245,158,11,0.18),rgba(249,115,22,0.08))] text-amber-50 shadow-[0_18px_50px_rgba(245,158,11,0.14)]",
    critical:
      "border-rose-400/20 bg-[linear-gradient(135deg,rgba(244,63,94,0.18),rgba(239,68,68,0.08))] text-rose-50 shadow-[0_18px_50px_rgba(244,63,94,0.16)]",
    accent:
      "border-violet-400/20 bg-[linear-gradient(135deg,rgba(139,92,246,0.18),rgba(34,211,238,0.08))] text-violet-50 shadow-[0_18px_50px_rgba(139,92,246,0.14)]",
    default:
      "border-cyan-400/10 bg-[linear-gradient(135deg,rgba(34,211,238,0.12),rgba(255,255,255,0.04))] text-white shadow-[0_18px_50px_rgba(34,211,238,0.08)]",
  };

  return tones[tone] || tones.default;
}

export function getAdminStatusTone(value) {
  const normalized = String(value || "").toLowerCase();
  if (
    normalized.includes("healthy") ||
    normalized.includes("online") ||
    normalized.includes("connected") ||
    normalized.includes("processed") ||
    normalized.includes("success") ||
    normalized.includes("ready") ||
    normalized.includes("active")
  ) {
    return "border-emerald-400/20 bg-emerald-500/15 text-emerald-100";
  }
  if (
    normalized.includes("warning") ||
    normalized.includes("pending") ||
    normalized.includes("processing") ||
    normalized.includes("open") ||
    normalized.includes("busy") ||
    normalized.includes("degraded") ||
    normalized.includes("review")
  ) {
    return "border-amber-400/20 bg-amber-500/15 text-amber-50";
  }
  return "border-rose-400/20 bg-rose-500/15 text-rose-50";
}

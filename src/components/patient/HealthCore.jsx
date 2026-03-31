import React, { useMemo } from "react";

function getPalette(status) {
  if (status === "Critical Risk") {
    return {
      ring: "#ef4444",
      glow: "shadow-[0_0_40px_rgba(239,68,68,0.28)]",
      badge: "text-red-400 bg-red-500/10 border-red-500/20",
    };
  }
  if (status === "Moderate Risk") {
    return {
      ring: "#f59e0b",
      glow: "shadow-[0_0_40px_rgba(245,158,11,0.22)]",
      badge: "text-amber-300 bg-amber-500/10 border-amber-500/20",
    };
  }
  return {
    ring: "#22c55e",
    glow: "shadow-[0_0_40px_rgba(34,197,94,0.22)]",
    badge: "text-emerald-300 bg-emerald-500/10 border-emerald-500/20",
  };
}

export default function HealthCore({ score = 0, status = "Moderate Risk", explanation = "", reasons = [], isDark }) {
  const normalized = Math.max(0, Math.min(100, score));
  const radius = 84;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (normalized / 100) * circumference;
  const palette = useMemo(() => getPalette(status), [status]);

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border p-6 ${
        isDark ? "bg-slate-950 border-white/10" : "bg-white border-slate-100 shadow-lg shadow-slate-100/60"
      }`}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.12),_transparent_55%)] pointer-events-none" />
      <div className="relative grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-8 items-center">
        <div className="flex flex-col items-center text-center">
          <div className={`relative grid place-items-center h-56 w-56 rounded-full ${palette.glow}`}>
          <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 200 200">
            <circle cx="100" cy="100" r={radius} stroke={isDark ? "rgba(255,255,255,0.08)" : "#e2e8f0"} strokeWidth="14" fill="none" />
            <circle
              cx="100"
              cy="100"
              r={radius}
              stroke={palette.ring}
              strokeWidth="14"
              strokeLinecap="round"
              fill="none"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              className="transition-all duration-1000 ease-out"
            />
          </svg>

          <div
            className={`absolute inset-6 rounded-full backdrop-blur-xl ${
              isDark ? "bg-slate-900/85 border border-white/10" : "bg-white/90 border border-slate-100"
            }`}
          />

            <div className="relative">
              <div className={`text-xs font-black uppercase tracking-[0.34em] ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                Health Score
              </div>
              <div className={`mt-3 text-6xl font-black ${isDark ? "text-white" : "text-slate-900"}`}>{normalized}</div>
            </div>
          </div>

          <div className={`mt-6 inline-flex rounded-full border px-4 py-2 text-sm font-bold ${palette.badge}`}>
            {status}
          </div>
        </div>

        <div>
          <div className={`text-xs font-black uppercase tracking-[0.24em] ${isDark ? "text-slate-500" : "text-slate-400"}`}>
            Score Interpretation
          </div>
          <p className={`mt-3 max-w-2xl text-base leading-7 ${isDark ? "text-slate-200" : "text-slate-700"}`}>
            {explanation}
          </p>

          <div className={`mt-6 rounded-2xl p-4 ${isDark ? "bg-white/5" : "bg-slate-50"}`}>
            <div className={`text-xs font-black uppercase tracking-[0.24em] ${isDark ? "text-slate-500" : "text-slate-400"}`}>
              Why This Score
            </div>
            <div className="mt-3 space-y-3">
              {(reasons.length ? reasons : ["The score reflects the balance between current abnormalities, stability, and recent trend direction."]).map((reason) => (
                <div key={reason} className={`flex items-start gap-3 text-sm leading-6 ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                  <span className={`mt-2 h-2 w-2 rounded-full ${status === "Critical Risk" ? "bg-red-400" : status === "Moderate Risk" ? "bg-amber-400" : "bg-emerald-400"}`} />
                  <span>{reason}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

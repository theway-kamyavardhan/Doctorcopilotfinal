import React, { useMemo } from "react";
import { motion } from "framer-motion";
import { ArrowDownRight, ArrowRight, ArrowUpRight } from "lucide-react";

function getPalette(status) {
  if (status === "Critical Risk") {
    return {
      ring: "#ef4444",
      glow: "shadow-[0_0_60px_rgba(239,68,68,0.22)]",
      badge: "border-red-500/20 bg-red-500/12 text-red-200",
    };
  }
  if (status === "Moderate Risk") {
    return {
      ring: "#f59e0b",
      glow: "shadow-[0_0_60px_rgba(245,158,11,0.2)]",
      badge: "border-amber-500/20 bg-amber-500/12 text-amber-100",
    };
  }
  return {
    ring: "#22c55e",
    glow: "shadow-[0_0_60px_rgba(34,197,94,0.18)]",
    badge: "border-emerald-500/20 bg-emerald-500/12 text-emerald-100",
  };
}

function getTrendMeta(direction) {
  if (direction === "decreasing") {
    return {
      label: "Watching a downward shift",
      icon: ArrowDownRight,
    };
  }
  if (direction === "increasing") {
    return {
      label: "Overall profile improving",
      icon: ArrowUpRight,
    };
  }
  return {
    label: "Holding a stable line",
    icon: ArrowRight,
  };
}

export default function HealthCore({
  score = 0,
  status = "Moderate Risk",
  explanation = "",
  reasons = [],
  trendDirection = "stable",
  isDark,
}) {
  const normalized = Math.max(0, Math.min(100, score));
  const radius = 88;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (normalized / 100) * circumference;
  const palette = useMemo(() => getPalette(status), [status]);
  const trendMeta = useMemo(() => getTrendMeta(trendDirection), [trendDirection]);
  const TrendIcon = trendMeta.icon;

  return (
    <section
      className={`relative overflow-hidden rounded-[2rem] px-6 py-7 ${
        isDark
          ? "bg-slate-950 shadow-[0_28px_80px_rgba(2,6,23,0.45)]"
          : "bg-white shadow-[0_24px_80px_rgba(15,23,42,0.08)]"
      }`}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.14),_transparent_48%),radial-gradient(circle_at_bottom_right,_rgba(34,197,94,0.12),_transparent_36%)]" />

      <div className="relative grid gap-8 xl:grid-cols-[290px_1fr] xl:items-center">
        <div className="flex flex-col items-center text-center">
          <motion.div
            initial={{ opacity: 0.75, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.55, ease: "easeOut" }}
            className={`relative grid h-60 w-60 place-items-center rounded-full ${palette.glow}`}
          >
            <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 220 220">
              <circle
                cx="110"
                cy="110"
                r={radius}
                stroke={isDark ? "rgba(255,255,255,0.08)" : "rgba(148,163,184,0.18)"}
                strokeWidth="16"
                fill="none"
              />
              <motion.circle
                cx="110"
                cy="110"
                r={radius}
                stroke={palette.ring}
                strokeWidth="16"
                strokeLinecap="round"
                fill="none"
                strokeDasharray={circumference}
                initial={{ strokeDashoffset: circumference }}
                animate={{ strokeDashoffset: dashOffset }}
                transition={{ duration: 1.1, ease: "easeOut" }}
              />
            </svg>

            <div
              className={`absolute inset-6 rounded-full ${
                isDark
                  ? "bg-slate-900"
                  : "bg-slate-50"
              }`}
            />

            <div className="relative">
              <div
                className={`text-[11px] font-black uppercase tracking-[0.36em] ${
                  isDark ? "text-slate-500" : "text-slate-400"
                }`}
              >
                Health Core
              </div>
              <div className={`mt-3 text-6xl font-black ${isDark ? "text-white" : "text-slate-900"}`}>
                {normalized}
              </div>
            </div>
          </motion.div>

          <div className={`mt-5 inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-bold ${palette.badge}`}>
            <span className="h-2 w-2 rounded-full bg-current" />
            {status}
          </div>

          <div
            className={`mt-3 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm ${
              isDark ? "bg-slate-900 text-slate-300" : "bg-slate-100 text-slate-600"
            }`}
          >
            <TrendIcon size={14} />
            {trendMeta.label}
          </div>
        </div>

        <div className="space-y-5">
          <div>
            <div
              className={`text-[11px] font-black uppercase tracking-[0.28em] ${
                isDark ? "text-slate-500" : "text-slate-400"
              }`}
            >
              Clinical Reading
            </div>
            <p className={`mt-3 max-w-2xl text-lg leading-8 ${isDark ? "text-slate-100" : "text-slate-700"}`}>
              {explanation}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {(reasons.length
              ? reasons
              : ["The score balances current abnormalities, persistent issues, and direction of change."]
            )
              .slice(0, 4)
              .map((reason) => (
                <motion.div
                  key={reason}
                  whileHover={{ y: -2 }}
                  className={`rounded-2xl px-4 py-4 text-sm leading-6 ${
                    isDark
                      ? "bg-slate-900 text-slate-300"
                      : "bg-slate-50 text-slate-600"
                  }`}
                >
                  {reason}
                </motion.div>
              ))}
          </div>
        </div>
      </div>
    </section>
  );
}

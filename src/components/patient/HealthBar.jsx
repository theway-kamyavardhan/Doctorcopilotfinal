import React, { useMemo } from "react";
import { motion } from "framer-motion";
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  ShieldAlert,
  ShieldCheck,
  ShieldMinus,
} from "lucide-react";

function getTone(status) {
  if (status === "Critical Risk") {
    return {
      fill: "from-rose-500 via-red-500 to-orange-400",
      glow: "shadow-[0_16px_40px_rgba(239,68,68,0.28)]",
      badge: "bg-red-500/14 text-red-100 ring-1 ring-red-500/30",
      text: "text-red-200",
      muted: "Critical risk",
    };
  }

  if (status === "Moderate Risk") {
    return {
      fill: "from-amber-400 via-orange-400 to-yellow-300",
      glow: "shadow-[0_16px_40px_rgba(245,158,11,0.24)]",
      badge: "bg-amber-400/16 text-amber-100 ring-1 ring-amber-400/30",
      text: "text-amber-100",
      muted: "Watch state",
    };
  }

  return {
    fill: "from-emerald-400 via-cyan-400 to-sky-300",
    glow: "shadow-[0_16px_40px_rgba(16,185,129,0.24)]",
    badge: "bg-emerald-400/14 text-emerald-100 ring-1 ring-emerald-400/30",
    text: "text-emerald-100",
    muted: "Stable state",
  };
}

function getTrendMeta(direction) {
  if (direction === "decreasing") {
    return {
      label: "Downward pressure detected",
      icon: ArrowDownRight,
    };
  }

  if (direction === "increasing") {
    return {
      label: "Profile moving upward",
      icon: ArrowUpRight,
    };
  }

  return {
    label: "Holding a steady line",
    icon: ArrowRight,
  };
}

function getStatusIcon(status) {
  if (status === "Critical Risk") return ShieldAlert;
  if (status === "Moderate Risk") return ShieldMinus;
  return ShieldCheck;
}

function MiniBar({ label, value, tone, isDark }) {
  const safeValue = Math.max(0, Math.min(100, Number(value) || 0));

  return (
    <div
      className={`rounded-[1.6rem] px-4 py-4 ${
        isDark ? "bg-slate-950/50" : "bg-white/45"
      } backdrop-blur-md`}
    >
      <div className="flex items-center justify-between gap-4">
        <div
          className={`text-[11px] font-black uppercase tracking-[0.24em] ${
            isDark ? "text-slate-400" : "text-slate-500"
          }`}
        >
          {label}
        </div>
        <div className={`text-sm font-bold ${isDark ? "text-white" : "text-slate-900"}`}>{safeValue}%</div>
      </div>

      <div
        className={`mt-3 h-2.5 overflow-hidden rounded-full ${
          isDark ? "bg-slate-800/80" : "bg-slate-200/70"
        }`}
      >
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${safeValue}%` }}
          transition={{ duration: 0.85, ease: "easeOut" }}
          className={`h-full rounded-full bg-gradient-to-r ${tone.fill}`}
        />
      </div>
    </div>
  );
}

export default function HealthBar({
  score = 0,
  status = "Moderate Risk",
  explanation = "",
  reasons = [],
  trendDirection = "stable",
  subStats = [],
  isDark,
}) {
  const normalized = Math.max(0, Math.min(100, Number(score) || 0));
  const tone = useMemo(() => getTone(status), [status]);
  const trendMeta = useMemo(() => getTrendMeta(trendDirection), [trendDirection]);
  const TrendIcon = trendMeta.icon;
  const StatusIcon = getStatusIcon(status);
  const visibleReasons = reasons.length
    ? reasons.slice(0, 3)
    : ["This reading balances abnormal markers, persistence over time, and recent direction of change."];

  return (
    <section
      className={`relative overflow-hidden rounded-[2.4rem] border px-6 py-6 ${
        isDark
          ? "border-white/8 bg-slate-900/55 text-white shadow-[0_28px_80px_rgba(2,6,23,0.55)]"
          : "border-white/70 bg-white/62 text-slate-900 shadow-[0_30px_90px_rgba(15,23,42,0.12)]"
      } backdrop-blur-2xl`}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.2),_transparent_42%),radial-gradient(circle_at_bottom_right,_rgba(234,179,8,0.14),_transparent_34%)]" />

      <div className="relative space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div
              className={`text-[11px] font-black uppercase tracking-[0.32em] ${
                isDark ? "text-slate-400" : "text-slate-500"
              }`}
            >
              System Integrity
            </div>
            <div className="mt-3 flex items-center gap-3">
              <div className={`rounded-full p-2.5 ${tone.badge}`}>
                <StatusIcon size={18} />
              </div>
              <div>
                <div className={`text-5xl font-black tracking-tight ${isDark ? "text-white" : "text-slate-950"}`}>
                  {normalized}%
                </div>
                <div className={`mt-1 text-sm font-semibold ${tone.text}`}>Status: {status}</div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold ${
                isDark ? "bg-slate-950/70 text-slate-200" : "bg-white/70 text-slate-700"
              } backdrop-blur-md`}
            >
              <TrendIcon size={15} />
              {trendMeta.label}
            </div>
            <div className={`inline-flex rounded-full px-4 py-2 text-sm font-bold ${tone.badge}`}>{tone.muted}</div>
          </div>
        </div>

        <div>
          <div
            className={`h-7 overflow-hidden rounded-full ${
              isDark ? "bg-slate-950/75" : "bg-slate-200/70"
            }`}
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={normalized}
            aria-label="System Integrity"
          >
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${normalized}%` }}
              transition={{ duration: 1.05, ease: "easeOut" }}
              className={`relative h-full rounded-full bg-gradient-to-r ${tone.fill} ${tone.glow}`}
            >
              <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.28)_0,rgba(255,255,255,0.08)_20%,transparent_40%)]" />
            </motion.div>
          </div>

          <div className={`mt-3 flex items-center justify-between text-sm ${isDark ? "text-slate-300" : "text-slate-600"}`}>
            <span>AI system reading</span>
            <span className="font-semibold">{normalized}% integrity</span>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
          <div className="space-y-4">
            <div>
              <div
                className={`text-[11px] font-black uppercase tracking-[0.24em] ${
                  isDark ? "text-slate-400" : "text-slate-500"
                }`}
              >
                Clinical Reading
              </div>
              <p className={`mt-3 text-base leading-8 ${isDark ? "text-slate-100" : "text-slate-700"}`}>
                {explanation}
              </p>
            </div>

            <div>
              <div
                className={`text-[11px] font-black uppercase tracking-[0.24em] ${
                  isDark ? "text-slate-400" : "text-slate-500"
                }`}
              >
                Why this score
              </div>
              <div className="mt-3 space-y-2.5">
                {visibleReasons.map((reason, index) => (
                  <motion.div
                    key={`${reason}-${index}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.06 }}
                    className={`rounded-[1.4rem] px-4 py-3 text-sm leading-6 ${
                      isDark ? "bg-slate-950/55 text-slate-300" : "bg-white/48 text-slate-600"
                    } backdrop-blur-md`}
                  >
                    {reason}
                  </motion.div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div
              className={`text-[11px] font-black uppercase tracking-[0.24em] ${
                isDark ? "text-slate-400" : "text-slate-500"
              }`}
            >
              Subsystems
            </div>
            {subStats.map((item) => (
              <MiniBar key={item.label} label={item.label} value={item.value} tone={tone} isDark={isDark} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

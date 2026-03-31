import React, { useMemo } from "react";
import { motion } from "framer-motion";
import { formatParameterLabel, isAbnormalStatus } from "../../utils/patientIntelligence";

function Sparkline({ values = [], color = "#3b82f6", isDark }) {
  const filtered = values.filter((value) => typeof value === "number");
  if (!filtered.length) {
    return <div className={`h-8 rounded-full ${isDark ? "bg-slate-900" : "bg-slate-100"}`} />;
  }

  const max = Math.max(...filtered);
  const min = Math.min(...filtered);
  const range = max - min || 1;
  const points = filtered
    .map((value, index) => {
      const x = (index / Math.max(filtered.length - 1, 1)) * 100;
      const y = 27 - ((value - min) / range) * 22;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg viewBox="0 0 100 30" className="h-8 w-full">
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
}

function getPriority(metric) {
  const status = String(metric?.status || "").toLowerCase();
  if (status === "deficient" || status === "high" || status === "low") return 3;
  if (status === "insufficient") return 2;
  if (metric?.direction === "decreasing") return 1;
  return 0;
}

function LeadMetric({ item, isDark }) {
  const critical = isAbnormalStatus(item.status);

  return (
    <motion.div
      whileHover={{ y: -3 }}
      className={`min-w-[280px] flex-[1.16] rounded-[2rem] px-5 py-5 backdrop-blur-xl ${
        critical
          ? isDark
            ? "bg-amber-500/12 text-white shadow-[0_18px_48px_rgba(245,158,11,0.18)]"
            : "bg-amber-50/88 text-slate-900 shadow-[0_18px_48px_rgba(245,158,11,0.12)]"
          : isDark
            ? "bg-white/8 text-white"
            : "bg-white/75 text-slate-900"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className={`text-[11px] font-black uppercase tracking-[0.24em] ${isDark ? "text-slate-400" : "text-slate-500"}`}>
            Priority Parameter
          </div>
          <div className="mt-2 text-2xl font-black">{formatParameterLabel(item.name)}</div>
          <div className={`mt-2 text-4xl font-black tracking-tight ${critical ? "" : isDark ? "text-white" : "text-slate-900"}`}>
            {item.value ?? "-"}
          </div>
          <div className={`mt-1 text-sm ${isDark ? "text-slate-300" : "text-slate-600"}`}>
            {item.unit || "-"} | {item.status || "unknown"} | {item.direction || "stable"}
          </div>
        </div>

        <div
          className={`rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] ${
            critical
              ? isDark
                ? "bg-amber-500/15 text-amber-100"
                : "bg-white text-amber-700"
              : isDark
                ? "bg-slate-800 text-slate-300"
                : "bg-white text-slate-600"
          }`}
        >
          {critical ? "watch" : "stable"}
        </div>
      </div>

      <div className="mt-5">
        <Sparkline values={item.history} color={item.color} isDark={isDark} />
      </div>
    </motion.div>
  );
}

function SecondaryMetric({ item, isDark }) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      className={`min-w-[180px] flex-1 rounded-[1.6rem] px-4 py-4 backdrop-blur-lg ${
        isDark ? "bg-white/6 text-slate-200" : "bg-white/52 text-slate-700"
      }`}
    >
      <div className={`text-[11px] font-black uppercase tracking-[0.22em] ${isDark ? "text-slate-500" : "text-slate-400"}`}>
        {formatParameterLabel(item.name)}
      </div>
      <div className={`mt-2 text-2xl font-black ${isDark ? "text-white" : "text-slate-900"}`}>
        {item.value ?? "-"}
      </div>
      <div className={`mt-1 text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>
        {item.status || "unknown"}
      </div>
      <div className="mt-3">
        <Sparkline values={item.history} color={item.color} isDark={isDark} />
      </div>
    </motion.div>
  );
}

export default function DataStrip({ metrics = [], isDark }) {
  const visibleMetrics = useMemo(() => metrics.filter(Boolean).slice(0, 4), [metrics]);
  const sortedMetrics = useMemo(
    () => [...visibleMetrics].sort((a, b) => getPriority(b) - getPriority(a)),
    [visibleMetrics]
  );
  const leadMetric = sortedMetrics[0] || null;
  const secondaryMetrics = sortedMetrics.slice(1);

  return (
    <section
      className={`rounded-[2.2rem] border px-4 py-4 ${
        isDark
          ? "border-white/8 bg-slate-900/55 text-white shadow-[0_28px_80px_rgba(2,6,23,0.45)]"
          : "border-white/70 bg-white/60 text-slate-900 shadow-[0_20px_60px_rgba(15,23,42,0.06)]"
      } backdrop-blur-2xl`}
    >
      {leadMetric ? (
        <div className="flex flex-wrap gap-3">
          <LeadMetric item={leadMetric} isDark={isDark} />
          {secondaryMetrics.map((item) => (
            <SecondaryMetric key={item.name} item={item} isDark={isDark} />
          ))}
        </div>
      ) : (
        <div className={`px-3 py-2 text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>
          Data strip activates after the first structured report is processed.
        </div>
      )}
    </section>
  );
}

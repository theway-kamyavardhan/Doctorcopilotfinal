import React, { useMemo } from "react";
import { motion } from "framer-motion";
import { Activity, AlertTriangle } from "lucide-react";

function buildSignals(alerts = [], anomalies = []) {
  const combined = [
    ...anomalies.map((item) => ({
      title: item.message,
      description: `${String(item.parameter || "").replaceAll("_", " ")} | ${String(item.type || "")
        .replaceAll("_", " ")
        .trim()}`,
      severity: item.severity || "warning",
      kind: "anomaly",
    })),
    ...alerts.map((item) => ({
      title: item.title,
      description: item.description,
      severity: item.severity || "warning",
      kind: "alert",
    })),
  ];

  const unique = [];
  const seen = new Set();

  combined.forEach((signal) => {
    const key = `${signal.title}|${signal.description}|${signal.severity}`;
    if (seen.has(key)) return;
    seen.add(key);
    unique.push(signal);
  });

  return unique.slice(0, 6);
}

function getSeverityClasses(severity, isDark) {
  if (severity === "critical") {
    return {
      strip: "bg-red-500",
      surface: isDark
        ? "border-red-500/20 bg-red-500/10 text-red-100"
        : "border-red-200 bg-red-50/90 text-red-700",
    };
  }

  return {
    strip: "bg-amber-400",
    surface: isDark
      ? "border-amber-500/20 bg-amber-500/10 text-amber-100"
      : "border-amber-200 bg-amber-50/90 text-amber-700",
  };
}

export default function HealthSignalsStream({ alerts = [], anomalies = [], isDark }) {
  const signals = useMemo(() => buildSignals(alerts, anomalies), [alerts, anomalies]);

  return (
    <section
      className={`relative overflow-hidden rounded-[2rem] px-6 py-6 ${
        isDark
          ? "bg-slate-950 shadow-[0_28px_80px_rgba(2,6,23,0.45)]"
          : "bg-white shadow-[0_24px_80px_rgba(15,23,42,0.08)]"
      }`}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(245,158,11,0.14),_transparent_42%)]" />

      <div className="relative">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div
              className={`text-[11px] font-black uppercase tracking-[0.3em] ${
                isDark ? "text-slate-500" : "text-slate-400"
              }`}
            >
              Health Signals
            </div>
            <p className={`mt-2 max-w-sm text-sm leading-6 ${isDark ? "text-slate-300" : "text-slate-600"}`}>
              A live stream of the most important abnormalities, risks, and repeating clinical patterns.
            </p>
          </div>

          <div
            className={`rounded-full px-3 py-2 text-xs font-black uppercase tracking-[0.22em] ${
              isDark ? "bg-slate-900 text-slate-300" : "bg-slate-100 text-slate-600"
            }`}
          >
            {signals.length} active
          </div>
        </div>

        {signals.length ? (
          <div className="mt-6 space-y-3">
            {signals.map((signal, index) => {
              const tone = getSeverityClasses(signal.severity, isDark);
              const Icon = signal.kind === "anomaly" ? AlertTriangle : Activity;

              return (
                <motion.div
                  key={`${signal.title}-${index}`}
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: index * 0.06 }}
                  className={`group flex items-start gap-4 rounded-2xl p-4 ${tone.surface}`}
                >
                  <div className={`mt-1 h-12 w-1 rounded-full ${tone.strip}`} />
                  <Icon size={16} className="mt-0.5 shrink-0 opacity-90" />
                  <div className="min-w-0">
                    <div className="font-bold leading-6">{signal.title}</div>
                    <div className="mt-1 text-sm opacity-90">{signal.description}</div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div
            className={`mt-6 rounded-2xl px-4 py-4 text-sm ${
              isDark ? "bg-slate-900 text-slate-400" : "bg-slate-100 text-slate-500"
            }`}
          >
            No active health signals are being surfaced right now.
          </div>
        )}
      </div>
    </section>
  );
}

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

  const seen = new Set();
  return combined
    .filter((signal) => {
      const key = `${signal.title}|${signal.description}|${signal.severity}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 6);
}

function getTone(severity, isDark) {
  if (severity === "critical") {
    return {
      strip: "bg-gradient-to-b from-red-400 via-rose-500 to-orange-400",
      surface: isDark ? "bg-red-500/10 text-red-50" : "bg-red-50/78 text-red-700",
      glow: "group-hover:shadow-[0_12px_30px_rgba(239,68,68,0.2)]",
    };
  }

  return {
    strip: "bg-gradient-to-b from-amber-300 via-orange-400 to-yellow-300",
    surface: isDark ? "bg-amber-500/10 text-amber-50" : "bg-amber-50/82 text-amber-700",
    glow: "group-hover:shadow-[0_12px_30px_rgba(245,158,11,0.18)]",
  };
}

export default function SignalStream({ alerts = [], anomalies = [], isDark }) {
  const signals = useMemo(() => buildSignals(alerts, anomalies), [alerts, anomalies]);

  return (
    <aside
      className={`relative overflow-hidden rounded-[2.2rem] border px-5 py-6 ${
        isDark
          ? "border-white/8 bg-slate-900/55 text-white shadow-[0_28px_80px_rgba(2,6,23,0.5)]"
          : "border-white/70 bg-white/60 text-slate-900 shadow-[0_24px_70px_rgba(15,23,42,0.1)]"
      } backdrop-blur-2xl`}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(251,191,36,0.2),_transparent_36%)]" />

      <div className="relative">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div
              className={`text-[11px] font-black uppercase tracking-[0.3em] ${
                isDark ? "text-slate-400" : "text-slate-500"
              }`}
            >
              Signal Stream
            </div>
            <p className={`mt-2 max-w-sm text-sm leading-6 ${isDark ? "text-slate-300" : "text-slate-600"}`}>
              Live abnormality signals and repeat patterns surfaced from your report history.
            </p>
          </div>

          <div
            className={`rounded-full px-3 py-2 text-[11px] font-black uppercase tracking-[0.2em] ${
              isDark ? "bg-slate-950/70 text-slate-300" : "bg-white/70 text-slate-600"
            } backdrop-blur-md`}
          >
            {signals.length} live
          </div>
        </div>

        {signals.length ? (
          <div className="mt-6 space-y-3">
            {signals.map((signal, index) => {
              const tone = getTone(signal.severity, isDark);
              const Icon = signal.kind === "anomaly" ? AlertTriangle : Activity;

              return (
                <motion.div
                  key={`${signal.title}-${index}`}
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: index * 0.07 }}
                  className={`group grid grid-cols-[5px_1fr] gap-4 rounded-[1.5rem] px-4 py-4 transition-all duration-300 ${tone.surface} ${tone.glow} backdrop-blur-md`}
                >
                  <div className={`rounded-full ${tone.strip}`} />
                  <div className="min-w-0">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 opacity-90">
                        <Icon size={16} />
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold leading-6">{signal.title}</div>
                        <div className="mt-1 text-sm leading-6 opacity-90">{signal.description}</div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div
            className={`mt-6 rounded-[1.5rem] px-4 py-4 text-sm ${
              isDark ? "bg-slate-950/60 text-slate-400" : "bg-white/55 text-slate-500"
            } backdrop-blur-md`}
          >
            No high-priority signals are active right now.
          </div>
        )}
      </div>
    </aside>
  );
}

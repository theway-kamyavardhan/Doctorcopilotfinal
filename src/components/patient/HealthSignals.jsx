import React, { useMemo } from "react";
import { Activity, AlertTriangle, Siren } from "lucide-react";

function buildSignals(alerts = [], anomalies = []) {
  const combined = [
    ...anomalies.map((item) => ({
      title: item.message,
      description: `${String(item.parameter || "").replaceAll("_", " ")} • ${String(item.type || "").replaceAll("_", " ")}`,
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
  for (const signal of combined) {
    const key = `${signal.title}|${signal.description}|${signal.severity}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(signal);
  }
  return unique.slice(0, 6);
}

function getToneClasses(severity, isDark) {
  if (severity === "critical") {
    return isDark
      ? "border-red-500/20 bg-red-500/10 text-red-100"
      : "border-red-200 bg-red-50 text-red-700";
  }
  return isDark
    ? "border-amber-500/20 bg-amber-500/10 text-amber-100"
    : "border-amber-200 bg-amber-50 text-amber-700";
}

export default function HealthSignals({ alerts = [], anomalies = [], isDark }) {
  const signals = useMemo(() => buildSignals(alerts, anomalies), [alerts, anomalies]);
  const criticalCount = signals.filter((item) => item.severity === "critical").length;

  return (
    <section
      className={`rounded-2xl border p-6 ${
        isDark ? "bg-slate-950 border-white/10" : "bg-white border-slate-100 shadow-lg shadow-slate-100/50"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={`rounded-2xl p-3 ${isDark ? "bg-amber-500/10 text-amber-300" : "bg-amber-50 text-amber-700"}`}>
            <Siren size={18} />
          </div>
          <div>
            <h2 className={`text-xl font-black ${isDark ? "text-white" : "text-slate-900"}`}>Health Signals</h2>
            <p className={`mt-1 text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>
              Important clinical changes and persistent concerns across your recent history.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className={`rounded-full px-3 py-1 text-xs font-bold ${isDark ? "bg-white/5 text-slate-300" : "bg-slate-100 text-slate-600"}`}>
            {signals.length} active
          </span>
          <span className={`rounded-full px-3 py-1 text-xs font-bold ${criticalCount ? "bg-red-500/10 text-red-500" : isDark ? "bg-emerald-500/10 text-emerald-300" : "bg-emerald-50 text-emerald-700"}`}>
            {criticalCount} critical
          </span>
        </div>
      </div>

      {signals.length ? (
        <div className="mt-6 space-y-3">
          {signals.map((signal, index) => (
            <div key={`${signal.title}-${index}`} className={`rounded-2xl border p-4 ${getToneClasses(signal.severity, isDark)}`}>
              <div className="flex items-start gap-3">
                {signal.kind === "anomaly" ? <AlertTriangle size={16} className="mt-0.5 shrink-0" /> : <Activity size={16} className="mt-0.5 shrink-0" />}
                <div className="min-w-0">
                  <div className="font-bold leading-6">{signal.title}</div>
                  <div className="mt-1 text-sm opacity-90">{signal.description}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className={`mt-6 rounded-2xl p-4 text-sm ${isDark ? "bg-white/5 text-slate-400" : "bg-slate-50 text-slate-500"}`}>
          No active health signals are being surfaced right now.
        </div>
      )}
    </section>
  );
}

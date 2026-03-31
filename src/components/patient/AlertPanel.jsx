import React from "react";
import { AlertTriangle } from "lucide-react";

function toneClasses(severity, isDark) {
  if (severity === "critical") {
    return isDark
      ? "bg-red-500/10 border-red-500/20 text-red-100"
      : "bg-red-50 border-red-200 text-red-700";
  }

  return isDark
    ? "bg-amber-500/10 border-amber-500/20 text-amber-100"
    : "bg-amber-50 border-amber-200 text-amber-700";
}

export default function AlertPanel({ alerts = [], isDark }) {
  return (
    <section
      className={`rounded-[2rem] border p-6 ${
        isDark ? "bg-slate-950 border-white/10" : "bg-white border-slate-100 shadow-lg shadow-slate-100/60"
      }`}
    >
      <div className="flex items-center gap-3 mb-5">
        <div className={`rounded-2xl p-3 ${isDark ? "bg-red-500/10 text-red-300" : "bg-red-50 text-red-600"}`}>
          <AlertTriangle size={18} />
        </div>
        <div>
          <h2 className={`text-xl font-black ${isDark ? "text-white" : "text-slate-900"}`}>Critical Alerts</h2>
          <p className={`text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>
            Persistent or clinically meaningful findings that deserve attention.
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {alerts.length ? (
          alerts.map((alert, index) => (
            <div
              key={`${alert.title}-${index}`}
              className={`rounded-2xl border px-4 py-4 ${toneClasses(alert.severity, isDark)}`}
            >
              <div className="font-bold">{alert.title}</div>
              <div className="mt-1 text-sm opacity-90">{alert.description}</div>
            </div>
          ))
        ) : (
          <div className={`rounded-2xl px-4 py-4 text-sm ${isDark ? "bg-white/5 text-slate-400" : "bg-slate-50 text-slate-500"}`}>
            No critical alerts are currently active across the stored reports.
          </div>
        )}
      </div>
    </section>
  );
}

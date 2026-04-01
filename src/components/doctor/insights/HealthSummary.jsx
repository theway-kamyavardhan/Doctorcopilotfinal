import React from "react";
import { summarizeHealthMetrics } from "./insightHelpers";

export default function HealthSummary({ trends, insights, isDark }) {
  const summary = summarizeHealthMetrics(trends, insights);

  return (
    <div className={`rounded-[1.6rem] border p-5 ${isDark ? "border-white/10 bg-white/[0.03]" : "border-slate-200 bg-white"}`}>
      <div className={`text-xs font-black uppercase tracking-[0.2em] ${isDark ? "text-slate-500" : "text-slate-400"}`}>
        Health Metric Summary
      </div>
      <div className="mt-3 flex items-end justify-between gap-4">
        <div>
          <div className="text-4xl font-black">{summary.score}</div>
          <div className={`mt-1 text-sm font-bold uppercase tracking-[0.16em] ${
            summary.status === "Critical"
              ? "text-red-400"
              : summary.status === "Risk"
                ? "text-amber-400"
                : "text-emerald-400"
          }`}>
            {summary.status}
          </div>
        </div>
        <div className={`rounded-full px-3 py-1 text-xs font-black uppercase tracking-[0.16em] ${
          isDark ? "bg-white/5 text-slate-300" : "bg-slate-100 text-slate-600"
        }`}>
          Read-only from stored patient data
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        {[
          ["Abnormal", summary.abnormalCount],
          ["Stable", summary.stableCount],
          ["Unstable", summary.unstableCount],
        ].map(([label, value]) => (
          <div key={label} className={`rounded-2xl px-4 py-3 ${isDark ? "bg-slate-950 text-slate-200" : "bg-slate-50 text-slate-700"}`}>
            <div className={`text-xs font-black uppercase tracking-[0.18em] ${isDark ? "text-slate-500" : "text-slate-400"}`}>
              {label}
            </div>
            <div className="mt-2 text-2xl font-black">{value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

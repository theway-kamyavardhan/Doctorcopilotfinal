import React from "react";
import { buildHistoricalRows } from "./insightHelpers";

function statusClasses(status, isDark) {
  const normalized = String(status || "").toLowerCase();
  if (["deficient", "critical"].includes(normalized)) {
    return isDark ? "bg-red-500/10 text-red-200" : "bg-red-50 text-red-700";
  }
  if (["low", "high", "insufficient"].includes(normalized)) {
    return isDark ? "bg-amber-500/10 text-amber-200" : "bg-amber-50 text-amber-700";
  }
  return isDark ? "bg-emerald-500/10 text-emerald-200" : "bg-emerald-50 text-emerald-700";
}

export default function HistoricalValuesTable({ trends, isDark }) {
  const rows = buildHistoricalRows(trends);

  return (
    <div className="space-y-3">
      <div className={`text-xs font-black uppercase tracking-[0.2em] ${isDark ? "text-slate-500" : "text-slate-400"}`}>
        Historical Values
      </div>
      <div className={`overflow-hidden rounded-[1.8rem] border ${isDark ? "border-white/10 bg-slate-950/70" : "border-slate-200 bg-white"}`}>
        <div className={`grid grid-cols-[1fr_0.7fr_0.8fr_0.7fr_0.8fr_2fr] gap-3 px-4 py-3 text-xs font-black uppercase tracking-[0.18em] ${isDark ? "bg-white/5 text-slate-500" : "bg-slate-50 text-slate-400"}`}>
          <div>Parameter</div>
          <div>Reports</div>
          <div>Latest</div>
          <div>Status</div>
          <div>Range</div>
          <div>History</div>
        </div>
        {rows.length ? rows.map((row) => (
          <div
            key={row.key}
            className={`grid grid-cols-[1fr_0.7fr_0.8fr_0.7fr_0.8fr_2fr] gap-3 border-t px-4 py-4 text-sm ${isDark ? "border-white/10 text-slate-200" : "border-slate-200 text-slate-700"}`}
          >
            <div className="font-bold" style={{ color: row.color }}>{row.label}</div>
            <div>{row.count}</div>
            <div>{row.latestValue}</div>
            <div>
              <span className={`rounded-full px-3 py-1 text-xs font-black uppercase tracking-[0.14em] ${statusClasses(row.latestStatus, isDark)}`}>
                {row.latestStatus}
              </span>
            </div>
            <div>
              {row.minValue != null && row.maxValue != null ? `${row.minValue} - ${row.maxValue}` : "n/a"}
            </div>
            <div className={`leading-6 ${isDark ? "text-slate-400" : "text-slate-500"}`}>{row.values || "No history"}</div>
          </div>
        )) : (
          <div className={`px-4 py-6 text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>
            No longitudinal parameter values are available yet.
          </div>
        )}
      </div>
    </div>
  );
}

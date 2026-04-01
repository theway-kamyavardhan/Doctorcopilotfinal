import React from "react";
import { ArrowDownRight, ArrowRight, ArrowUpRight } from "lucide-react";
import { buildTrendInsightRows } from "./insightHelpers";

function DirectionIcon({ direction }) {
  if (direction === "increasing") return <ArrowUpRight size={16} />;
  if (direction === "decreasing") return <ArrowDownRight size={16} />;
  return <ArrowRight size={16} />;
}

export default function TrendInsights({ trends, isDark }) {
  const rows = buildTrendInsightRows(trends);

  return (
    <div className="space-y-3">
      <div className={`text-xs font-black uppercase tracking-[0.2em] ${isDark ? "text-slate-500" : "text-slate-400"}`}>
        Trend Intelligence
      </div>
      {rows.length ? (
        <div className="space-y-3">
          {rows.map((row) => (
            <div
              key={row.key}
              className={`flex flex-col gap-3 rounded-2xl border px-4 py-4 md:flex-row md:items-center md:justify-between ${
                isDark ? "border-white/10 bg-white/[0.03]" : "border-slate-200 bg-white"
              }`}
            >
              <div className="min-w-0">
                <div className="font-black">{row.label}</div>
                <div className={`mt-1 text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>{row.interpretation}</div>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-sm font-bold">
                <div className="inline-flex items-center gap-1" style={{ color: row.color }}>
                  <DirectionIcon direction={row.direction} />
                  {row.direction}
                </div>
                <div className={isDark ? "text-slate-200" : "text-slate-700"}>{row.change}</div>
                <div className={`rounded-full px-3 py-1 text-xs uppercase tracking-[0.16em] ${
                  row.status === "warning"
                    ? isDark ? "bg-amber-500/10 text-amber-200" : "bg-amber-50 text-amber-700"
                    : row.status === "improving"
                      ? isDark ? "bg-emerald-500/10 text-emerald-200" : "bg-emerald-50 text-emerald-700"
                      : isDark ? "bg-white/5 text-slate-300" : "bg-slate-100 text-slate-600"
                }`}>
                  {row.stability}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className={`rounded-2xl px-4 py-3 text-sm ${isDark ? "bg-white/5 text-slate-400" : "bg-slate-100 text-slate-500"}`}>
          No trend intelligence is available yet.
        </div>
      )}
    </div>
  );
}

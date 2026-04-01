import React from "react";
import { ArrowDownRight, ArrowRight, ArrowUpRight } from "lucide-react";
import { getLatestParameterCards } from "./insightHelpers";

function getStatusClasses(status, isDark) {
  const normalized = String(status || "").toLowerCase();
  if (["deficient", "critical"].includes(normalized)) {
    return isDark ? "bg-red-500/10 text-red-200" : "bg-red-50 text-red-700";
  }
  if (["low", "high", "insufficient"].includes(normalized)) {
    return isDark ? "bg-amber-500/10 text-amber-200" : "bg-amber-50 text-amber-700";
  }
  return isDark ? "bg-emerald-500/10 text-emerald-200" : "bg-emerald-50 text-emerald-700";
}

function DirectionIcon({ direction }) {
  if (direction === "increasing") return <ArrowUpRight size={16} />;
  if (direction === "decreasing") return <ArrowDownRight size={16} />;
  return <ArrowRight size={16} />;
}

export default function ParameterGrid({ trends, isDark }) {
  const cards = getLatestParameterCards(trends);

  return (
    <div className="space-y-3">
      <div className={`text-xs font-black uppercase tracking-[0.2em] ${isDark ? "text-slate-500" : "text-slate-400"}`}>
        Parameter Breakdown
      </div>
      {cards.length ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {cards.map((item) => (
            <div
              key={item.key}
              className={`rounded-2xl border px-4 py-4 ${
                isDark ? "border-white/10 bg-white/[0.03]" : "border-slate-200 bg-white"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className={`text-xs font-black uppercase tracking-[0.18em] ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                    Parameter
                  </div>
                  <div className="mt-2 text-base font-black">{item.label}</div>
                </div>
                <div className="flex items-center gap-1 text-sm font-bold" style={{ color: item.color }}>
                  <DirectionIcon direction={item.direction} />
                  {item.change || item.direction}
                </div>
              </div>

              <div className="mt-4 flex items-end justify-between gap-3">
                <div className="text-2xl font-black">
                  {item.latestValue ?? "-"}
                  <span className={`ml-1 text-sm font-semibold ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                    {item.latestUnit}
                  </span>
                </div>
                <div className={`rounded-full px-3 py-1 text-xs font-black uppercase tracking-[0.15em] ${getStatusClasses(item.latestStatus, isDark)}`}>
                  {item.latestStatus}
                </div>
              </div>

              <div className={`mt-3 text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                {item.trend} • {item.stability}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className={`rounded-2xl px-4 py-3 text-sm ${isDark ? "bg-white/5 text-slate-400" : "bg-slate-100 text-slate-500"}`}>
          No parameter breakdown is available for this patient yet.
        </div>
      )}
    </div>
  );
}

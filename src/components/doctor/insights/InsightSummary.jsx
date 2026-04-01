import React from "react";
import { buildInsightSummaryItems } from "./insightHelpers";

export default function InsightSummary({ insights, trends, isDark }) {
  const items = buildInsightSummaryItems(insights, trends);

  return (
    <div className="space-y-3">
      <div className={`text-xs font-black uppercase tracking-[0.2em] ${isDark ? "text-slate-500" : "text-slate-400"}`}>
        Insight Summary
      </div>
      {items.length ? (
        <div className="space-y-3">
          {items.map((item, index) => (
            <div
              key={`${item}-${index}`}
              className={`rounded-2xl px-4 py-3 text-sm ${
                isDark ? "bg-cyan-500/10 text-slate-200" : "bg-blue-50 text-slate-700"
              }`}
            >
              {item}
            </div>
          ))}
        </div>
      ) : (
        <div className={`rounded-2xl px-4 py-3 text-sm ${isDark ? "bg-white/5 text-slate-400" : "bg-slate-100 text-slate-500"}`}>
          No stored patient insights are available yet.
        </div>
      )}
    </div>
  );
}

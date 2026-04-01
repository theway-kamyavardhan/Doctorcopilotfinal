import React from "react";
import { ActivitySquare, FileStack } from "lucide-react";
import { buildCoverageItems, formatChartDate } from "./insightHelpers";

export default function ReportCoverage({ trends, reports, isDark }) {
  const items = buildCoverageItems(trends, reports);

  return (
    <div className="space-y-3">
      <div className={`text-xs font-black uppercase tracking-[0.2em] ${isDark ? "text-slate-500" : "text-slate-400"}`}>
        Report Coverage
      </div>
      {items.length ? (
        <div className="grid gap-3 md:grid-cols-2">
          {items.map((item) => (
            <div
              key={`${item.id}-${item.date}`}
              className={`rounded-2xl border px-4 py-4 ${isDark ? "border-white/10 bg-white/[0.03]" : "border-slate-200 bg-white"}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-black">{item.reportType}</div>
                  <div className={`mt-1 text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                    {formatChartDate(item.date)} • {item.labName}
                  </div>
                </div>
                <div className={`rounded-full px-3 py-1 text-xs font-black uppercase tracking-[0.16em] ${item.source === "case"
                  ? isDark ? "bg-cyan-500/10 text-cyan-200" : "bg-cyan-50 text-cyan-700"
                  : isDark ? "bg-white/5 text-slate-300" : "bg-slate-100 text-slate-600"
                }`}>
                  {item.source === "case" ? "linked" : "trend"}
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2 text-sm">
                {item.source === "case" ? <FileStack size={15} /> : <ActivitySquare size={15} />}
                <span className={isDark ? "text-slate-300" : "text-slate-600"}>
                  {item.summary || "Available in the patient longitudinal dataset."}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className={`rounded-2xl px-4 py-3 text-sm ${isDark ? "bg-white/5 text-slate-400" : "bg-slate-100 text-slate-500"}`}>
          No report coverage entries are available yet.
        </div>
      )}
    </div>
  );
}

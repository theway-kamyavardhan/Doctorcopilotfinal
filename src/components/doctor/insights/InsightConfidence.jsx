import React from "react";
import { buildConfidenceModel } from "./insightHelpers";

export default function InsightConfidence({ trends, insights, isDark }) {
  const model = buildConfidenceModel(trends, insights);

  return (
    <div className={`rounded-[1.6rem] border p-5 ${isDark ? "border-white/10 bg-white/[0.03]" : "border-slate-200 bg-white"}`}>
      <div className={`text-xs font-black uppercase tracking-[0.2em] ${isDark ? "text-slate-500" : "text-slate-400"}`}>
        Confidence Display
      </div>
      <div className="mt-3 flex items-end gap-3">
        <div className="text-3xl font-black">{model.confidence}%</div>
        <div className={`pb-1 text-sm font-semibold ${isDark ? "text-slate-400" : "text-slate-500"}`}>
          confidence
        </div>
      </div>
      <div className={`mt-2 text-sm leading-6 ${isDark ? "text-slate-300" : "text-slate-600"}`}>
        Based on {model.reportCount || 0} reports. Coverage window: {model.dateRange}.
      </div>
      <div className={`mt-3 text-xs font-bold uppercase tracking-[0.16em] ${isDark ? "text-cyan-300" : "text-blue-700"}`}>
        {model.insightCount} persisted insights reused without reprocessing
      </div>
    </div>
  );
}

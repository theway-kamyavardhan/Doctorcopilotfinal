import React from "react";
import { AlertTriangle } from "lucide-react";
import { getAnomalyPills, getAnomalySeverityForPoint } from "./insightHelpers";

export function buildAnomalyDotRenderer(parameter, trends) {
  return function AnomalyDot(props) {
    const { cx, cy, payload } = props;
    const severity = getAnomalySeverityForPoint(
      parameter,
      { date: payload?.date, status: payload?.[`${parameter}Status`] },
      trends?.anomalies || []
    );

    if (!severity || cx == null || cy == null) {
      return <circle cx={cx} cy={cy} r={3} fill="currentColor" opacity={0.7} />;
    }

    const fill = severity === "critical" ? "#ef4444" : "#f59e0b";
    return (
      <g>
        <circle cx={cx} cy={cy} r={7} fill={fill} opacity={0.18} />
        <circle cx={cx} cy={cy} r={4} fill={fill} stroke="#ffffff" strokeWidth={1.2} />
      </g>
    );
  };
}

export default function AnomalyMarkers({ trends, selectedParameters, isDark }) {
  const items = getAnomalyPills(trends, selectedParameters);

  if (!items.length) {
    return (
      <div className={`rounded-2xl px-4 py-3 text-sm ${isDark ? "bg-white/5 text-slate-400" : "bg-slate-100 text-slate-500"}`}>
        No anomaly markers were detected for the selected parameters.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className={`text-xs font-black uppercase tracking-[0.2em] ${isDark ? "text-slate-500" : "text-slate-400"}`}>
        Anomaly Markers
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {items.map((item) => (
          <div
            key={item.id}
            className={`rounded-2xl border px-4 py-3 text-sm ${
              item.severity === "critical"
                ? isDark
                  ? "border-red-500/20 bg-red-500/10 text-red-200"
                  : "border-red-200 bg-red-50 text-red-700"
                : isDark
                  ? "border-amber-500/20 bg-amber-500/10 text-amber-200"
                  : "border-amber-200 bg-amber-50 text-amber-700"
            }`}
          >
            <div className="flex items-start gap-3">
              <AlertTriangle size={16} className="mt-0.5 shrink-0" />
              <div>
                <div className="font-black">{item.parameter}</div>
                <div className="mt-1 leading-6">{item.message}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

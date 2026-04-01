import React, { useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import AnomalyMarkers, { buildAnomalyDotRenderer } from "./AnomalyMarkers";
import { buildTrendChartData, getChartParameters, getParameterMeta } from "./insightHelpers";

function InsightTooltip({ active, payload, label, isDark }) {
  if (!active || !payload?.length) return null;

  return (
    <div className={`rounded-2xl border px-4 py-3 text-sm shadow-xl ${isDark ? "border-white/10 bg-slate-950 text-slate-100" : "border-slate-200 bg-white text-slate-800"}`}>
      <div className="font-black">{label}</div>
      <div className="mt-2 space-y-1">
        {payload.map((entry) => (
          <div key={entry.dataKey} className="flex items-center justify-between gap-4">
            <span style={{ color: entry.color }}>{entry.name}</span>
            <span className="font-bold">{entry.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function TrendCharts({ trends, isDark }) {
  const availableParameters = useMemo(() => getChartParameters(trends), [trends]);
  const [selectedParameters, setSelectedParameters] = useState([]);

  useEffect(() => {
    const defaultSelection = availableParameters.slice(0, Math.min(3, availableParameters.length));
    setSelectedParameters((current) => {
      const stillValid = current.filter((item) => availableParameters.includes(item));
      return stillValid.length ? stillValid : defaultSelection;
    });
  }, [availableParameters]);

  const chartData = useMemo(
    () => buildTrendChartData(trends, selectedParameters),
    [trends, selectedParameters]
  );

  const toggleParameter = (parameter) => {
    setSelectedParameters((current) => {
      if (current.includes(parameter)) {
        if (current.length === 1) return current;
        return current.filter((item) => item !== parameter);
      }
      return [...current, parameter];
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {availableParameters.map((parameter) => {
          const meta = getParameterMeta(parameter);
          const active = selectedParameters.includes(parameter);
          return (
            <button
              key={parameter}
              type="button"
              onClick={() => toggleParameter(parameter)}
              className={`rounded-full border px-3 py-2 text-xs font-black uppercase tracking-[0.16em] transition-colors ${
                active
                  ? "text-white"
                  : isDark
                    ? "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
              }`}
              style={active ? { backgroundColor: meta.color, borderColor: meta.color } : undefined}
            >
              {meta.label}
            </button>
          );
        })}
      </div>

      <div className={`h-[22rem] rounded-[1.8rem] border p-4 ${isDark ? "border-white/10 bg-slate-950/70" : "border-slate-200 bg-white"}`}>
        {chartData.length ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 12, right: 18, bottom: 0, left: -16 }}>
              <CartesianGrid stroke={isDark ? "rgba(148,163,184,0.12)" : "rgba(148,163,184,0.18)"} vertical={false} />
              <XAxis dataKey="label" tick={{ fill: isDark ? "#94a3b8" : "#64748b", fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: isDark ? "#94a3b8" : "#64748b", fontSize: 12 }} axisLine={false} tickLine={false} width={52} />
              <Tooltip content={<InsightTooltip isDark={isDark} />} />
              {selectedParameters.map((parameter) => {
                const meta = getParameterMeta(parameter);
                return (
                  <Line
                    key={parameter}
                    type="monotone"
                    dataKey={parameter}
                    name={meta.label}
                    stroke={meta.color}
                    strokeWidth={2.5}
                    dot={buildAnomalyDotRenderer(parameter, trends)}
                    activeDot={{ r: 5 }}
                    connectNulls
                  />
                );
              })}
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className={`flex h-full items-center justify-center text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>
            No longitudinal trend data is available yet.
          </div>
        )}
      </div>

      <AnomalyMarkers trends={trends} selectedParameters={selectedParameters} isDark={isDark} />
    </div>
  );
}

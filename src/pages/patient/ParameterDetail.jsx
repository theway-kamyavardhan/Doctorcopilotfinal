import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { LoaderCircle, ArrowLeft, Activity } from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useTheme } from "../../context/ThemeContext";
import reportService from "../../services/report.service";
import {
  formatParameterLabel,
  getNormalRangeExplanation,
  getTrendArrow,
} from "../../utils/patientIntelligence";

export default function ParameterDetail() {
  const { isDark } = useTheme();
  const { name } = useParams();
  const [trends, setTrends] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const trendData = await reportService.getTrends();
        setTrends(trendData);
      } catch (err) {
        console.error(err);
        setError(err.message || "Failed to load parameter details.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const series = trends?.series?.[name] || [];
  const metric = trends?.metrics?.[name];
  const minValue = series.length ? Math.min(...series.map((point) => point.value)) : null;
  const maxValue = series.length ? Math.max(...series.map((point) => point.value)) : null;
  const latestPoint = series[series.length - 1] || null;
  const explanation = getNormalRangeExplanation(name, series);

  const linkedSummary = useMemo(() => {
    return (trends?.summary || []).filter((item) =>
      item.toLowerCase().includes(String(name || "").replaceAll("_", " ").toLowerCase())
    );
  }, [trends, name]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <LoaderCircle size={28} className="animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 px-4 md:px-0">
      <section className="flex items-start justify-between gap-4">
        <div>
          <Link
            to="/patient/trends"
            className={`inline-flex items-center gap-2 text-sm font-semibold ${isDark ? "text-slate-400 hover:text-white" : "text-slate-500 hover:text-slate-900"}`}
          >
            <ArrowLeft size={14} />
            Back to trends
          </Link>
          <h1 className={`mt-4 text-4xl font-black tracking-tight ${isDark ? "text-white" : "text-slate-900"}`}>
            {formatParameterLabel(name)}
          </h1>
          <p className={`mt-2 max-w-3xl ${isDark ? "text-slate-400" : "text-slate-500"}`}>
            Review the full historical curve, current direction, and clinically useful interpretation for this parameter.
          </p>
        </div>

        {metric ? (
          <div className={`rounded-2xl px-5 py-4 ${isDark ? "bg-white/5 text-slate-200" : "bg-white text-slate-700 shadow-sm"}`}>
            <div className="text-xs font-black uppercase tracking-[0.22em] opacity-60">Direction</div>
            <div className="mt-2 text-2xl font-black">
              {getTrendArrow(metric.direction)} {metric.direction}
            </div>
          </div>
        ) : null}
      </section>

      {error ? (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-500">
          {error}
        </div>
      ) : null}

      <section className="grid grid-cols-1 xl:grid-cols-[1.2fr_0.8fr] gap-6">
        <div className={`rounded-[2rem] border p-6 ${isDark ? "bg-slate-900 border-white/10" : "bg-white border-slate-100"}`}>
          {series.length ? (
            <div className="h-96">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={series}>
                  <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#1e293b" : "#e2e8f0"} />
                  <XAxis dataKey="date" stroke={isDark ? "#94a3b8" : "#64748b"} />
                  <YAxis stroke={isDark ? "#94a3b8" : "#64748b"} />
                  <Tooltip />
                  <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className={`rounded-2xl px-4 py-8 text-sm ${isDark ? "bg-white/5 text-slate-400" : "bg-slate-50 text-slate-500"}`}>
              No stored history is available for this parameter yet.
            </div>
          )}
        </div>

        <div className="space-y-6">
          <section className={`rounded-[2rem] border p-6 ${isDark ? "bg-slate-900 border-white/10" : "bg-white border-slate-100"}`}>
            <h2 className={`text-xl font-black mb-4 ${isDark ? "text-white" : "text-slate-900"}`}>Trend Snapshot</h2>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Latest", value: latestPoint ? `${latestPoint.value} ${latestPoint.unit || ""}` : "--" },
                { label: "Min", value: minValue ?? "--" },
                { label: "Max", value: maxValue ?? "--" },
                { label: "Change", value: metric?.change || "--" },
                { label: "Direction", value: metric?.direction || "--" },
                { label: "Stability", value: metric?.stability || "--" },
              ].map((item) => (
                <div key={item.label} className={`rounded-2xl px-4 py-4 ${isDark ? "bg-white/5" : "bg-slate-50"}`}>
                  <div className={`text-xs font-black uppercase tracking-[0.22em] ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                    {item.label}
                  </div>
                  <div className={`mt-2 text-lg font-black ${isDark ? "text-white" : "text-slate-900"}`}>{item.value}</div>
                </div>
              ))}
            </div>
          </section>

          <section className={`rounded-[2rem] border p-6 ${isDark ? "bg-slate-900 border-white/10" : "bg-white border-slate-100"}`}>
            <h2 className={`text-xl font-black mb-4 ${isDark ? "text-white" : "text-slate-900"}`}>Normal Range Explanation</h2>
            <p className={`text-sm leading-6 ${isDark ? "text-slate-300" : "text-slate-600"}`}>{explanation}</p>
          </section>
        </div>
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-[0.9fr_1.1fr] gap-6">
        <section className={`rounded-[2rem] border p-6 ${isDark ? "bg-slate-900 border-white/10" : "bg-white border-slate-100"}`}>
          <h2 className={`text-xl font-black mb-4 ${isDark ? "text-white" : "text-slate-900"}`}>Clinical Insights</h2>
          <div className="space-y-3">
            {linkedSummary.length ? (
              linkedSummary.map((item) => (
                <div key={item} className={`rounded-2xl px-4 py-3 ${isDark ? "bg-cyan-500/10 text-slate-200" : "bg-blue-50 text-slate-700"}`}>
                  {item}
                </div>
              ))
            ) : (
              <div className={`rounded-2xl px-4 py-3 text-sm ${isDark ? "bg-white/5 text-slate-400" : "bg-slate-50 text-slate-500"}`}>
                No linked comparative insight is available yet for this parameter.
              </div>
            )}
          </div>
        </section>

        <section className={`rounded-[2rem] border p-6 ${isDark ? "bg-slate-900 border-white/10" : "bg-white border-slate-100"}`}>
          <h2 className={`text-xl font-black mb-4 ${isDark ? "text-white" : "text-slate-900"}`}>Historical Values</h2>
          <div className="space-y-3">
            {series.length ? (
              series.map((point) => (
                <div key={`${point.date}-${point.value}`} className={`rounded-2xl px-4 py-3 ${isDark ? "bg-white/5 text-slate-200" : "bg-slate-50 text-slate-700"}`}>
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="font-semibold">{point.date}</div>
                      <div className={`text-xs uppercase tracking-[0.22em] ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                        {point.status || "unknown"}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-black">{point.value}</div>
                      <div className={`text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>{point.unit || ""}</div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className={`rounded-2xl px-4 py-8 text-sm ${isDark ? "bg-white/5 text-slate-400" : "bg-slate-50 text-slate-500"}`}>
                Historical values will appear here after more reports are processed.
              </div>
            )}
          </div>
        </section>
      </section>

      {!series.length ? (
        <section className={`rounded-[2rem] border p-8 text-center ${isDark ? "bg-slate-900 border-white/10" : "bg-white border-slate-100"}`}>
          <Activity size={30} className="mx-auto mb-4 text-slate-400" />
          <p className={`${isDark ? "text-slate-400" : "text-slate-500"}`}>
            This parameter does not yet have enough stored history for a full detail view.
          </p>
        </section>
      ) : null}
    </div>
  );
}

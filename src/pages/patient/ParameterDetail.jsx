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
import useViewport from "../../hooks/useViewport";
import MobileSparkline from "../../components/ui/MobileSparkline";
import reportService from "../../services/report.service";
import {
  formatParameterLabel,
  getNormalRangeExplanation,
  getTrendArrow,
} from "../../utils/patientIntelligence";


// ─── Native Mobile Port ───────────────────────────────────────────────────────
function ParameterDetailMobile({ isDark, name, series, metric, minValue, maxValue, latestPoint, explanation, linkedSummary, loading, error }) {
  
  if (isMobile) {
    return <ParameterDetailMobile isDark={isDark} name={name} series={series} metric={metric} minValue={minValue} maxValue={maxValue} latestPoint={latestPoint} explanation={explanation} linkedSummary={linkedSummary} loading={loading} error={error} />;
  }

if (loading) {
    return (
      <div className="flex flex-col min-h-[100svh] items-center justify-center pb-24">
        <LoaderCircle size={28} className="animate-spin text-blue-500" />
      </div>
    );
  }

  const chartData = series.map(p => p.value);
  const isPositive = metric?.direction === 'increasing';
  const isNegative = metric?.direction === 'decreasing';
  const strokeColor = isDark ? (isPositive ? '#34d399' : isNegative ? '#fb923c' : '#60a5fa') : (isPositive ? '#16a34a' : isNegative ? '#ea580c' : '#2563eb');

  return (
    <div className={`flex flex-col min-h-[100svh] w-full font-sans antialiased ${isDark ? 'bg-black text-white' : 'bg-[#F2F2F7] text-black'} pb-24`}>
      <header className="px-4 pt-12 pb-6">
        <Link to="/patient/trends" className="text-blue-500 font-bold mb-2 inline-flex items-center gap-1 active-feedback touch-target"><ArrowLeft size={20}/> Trends</Link>
        <h1 className="text-4xl font-bold tracking-tight">{formatParameterLabel(name)}</h1>
        <p className={`mt-1 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
          Historical detail and clinical interpretation.
        </p>
      </header>

      {error ? (
        <div className="mx-4 mb-6 rounded-2xl bg-red-100 p-4 text-sm font-semibold text-red-700">
          {error}
        </div>
      ) : null}

      <main className="px-4 space-y-6">
        {series.length ? (
          <>
            <section className={`rounded-3xl p-5 ${isDark ? 'bg-[#1C1C1E]' : 'bg-white shadow-sm'}`}>
              <div className="text-4xl font-bold tabular-nums flex items-baseline gap-1">
                {latestPoint ? latestPoint.value : "--"}
                <span className="text-sm font-medium text-gray-500">{latestPoint?.unit || ""}</span>
              </div>
              <div className="text-sm font-medium text-gray-500 mt-1">
                {latestPoint?.date || "No date"}
              </div>

              <div className="h-48 w-full mt-6">
                <MobileSparkline 
                  data={chartData} 
                  color={strokeColor} 
                  height={192} 
                  strokeWidth={3}
                />
              </div>

              <div className={`mt-4 pt-4 border-t ${isDark ? 'border-[#38383A]' : 'border-[#E5E5EA]'} grid grid-cols-3 gap-2 text-center`}>
                <div>
                  <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Min</div>
                  <div className="text-lg font-bold mt-1 tabular-nums">{minValue ?? "--"}</div>
                </div>
                <div>
                  <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Max</div>
                  <div className="text-lg font-bold mt-1 tabular-nums">{maxValue ?? "--"}</div>
                </div>
                <div>
                  <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Change</div>
                  <div className="text-lg font-bold mt-1">{metric?.change || "--"}</div>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-bold mb-3 px-1">Normal Range</h2>
              <div className={`rounded-3xl p-5 ${isDark ? 'bg-[#1C1C1E]' : 'bg-white shadow-sm'}`}>
                <p className={`text-[15px] leading-snug ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                  {explanation}
                </p>
              </div>
            </section>

            {linkedSummary.length > 0 && (
              <section>
                <h2 className="text-xl font-bold mb-3 px-1">Clinical Insights</h2>
                <div className={`rounded-3xl p-5 ${isDark ? 'bg-[#1C1C1E]' : 'bg-white shadow-sm'}`}>
                  <div className="space-y-4">
                    {linkedSummary.map((item, idx) => (
                      <p key={idx} className={`text-[15px] leading-snug ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                        {item}
                      </p>
                    ))}
                  </div>
                </div>
              </section>
            )}

            <section>
              <h2 className="text-xl font-bold mb-3 px-1">History</h2>
              <div className={`rounded-3xl overflow-hidden content-visibility-auto ${isDark ? 'bg-[#1C1C1E]' : 'bg-white shadow-sm'}`}>
                <div className="divide-y divide-gray-200 dark:divide-[#38383A]">
                  {[...series].reverse().map((point, index) => (
                    <div key={`${point.date}-${index}`} className="p-4 flex justify-between items-center active-feedback">
                      <div>
                        <div className="text-[15px] font-bold tabular-nums">
                          {point.value} <span className="text-xs font-normal text-gray-500">{point.unit || ""}</span>
                        </div>
                        <div className={`text-sm mt-0.5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                          {point.date}
                        </div>
                      </div>
                      <div className={`text-[11px] font-bold uppercase tracking-wider px-2 py-1 rounded-md ${
                        point.status === 'low' || point.status === 'high' ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'
                      }`}>
                        {point.status || 'stable'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center mt-12">
            <Activity size={48} className={`mb-4 ${isDark ? 'text-gray-700' : 'text-gray-300'}`} />
            <p className={`text-lg font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              No stored history is available for this parameter yet.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

export default function ParameterDetail() {
  const { isDark } = useTheme();
  const { isMobile } = useViewport();
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

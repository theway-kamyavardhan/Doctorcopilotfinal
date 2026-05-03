import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useTheme } from "../../context/ThemeContext";
import { Activity, ArrowRight, Filter, LoaderCircle, Sparkles, TrendingUp } from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatParameterLabel, getTrendArrow } from "../../utils/patientIntelligence";
import usePatientTrendsData from "../../hooks/usePatientTrendsData";
import useViewport from "../../hooks/useViewport";

const PRIORITY_PARAMETERS = ["hemoglobin", "platelets", "vitamin_b12"];

function getOrderedParameters(trends) {
  const available = Object.keys(trends?.series || {});
  const priority = PRIORITY_PARAMETERS.filter((item) => available.includes(item));
  const remainder = available.filter((item) => !priority.includes(item)).sort();
  return [...priority, ...remainder];
}

function badgeClasses(isDark, tone = "neutral") {
  if (tone === "positive") {
    return isDark ? "bg-emerald-500/10 text-emerald-300" : "bg-emerald-50 text-emerald-700";
  }
  if (tone === "negative") {
    return isDark ? "bg-red-500/10 text-red-300" : "bg-red-50 text-red-700";
  }
  return isDark ? "bg-white/5 text-slate-300" : "bg-slate-100 text-slate-700";
}

function TrendsMobile({
  isDark,
  trends,
  trendsError,
  parameters,
  activeParameter,
  activeSeries,
  activeMetric,
  latestPoint,
  minValue,
  maxValue,
  parameterSummary,
  intelligenceBullets,
  selectedParameter,
  setSelectedParameter,
}) {
  return (
    <div className="mobile-page-stack">
      <section className={`mobile-hero-card ${isDark ? "bg-slate-950 text-white" : "bg-white text-slate-950"}`}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className={`text-[0.68rem] font-black uppercase ${isDark ? "text-cyan-300" : "text-blue-700"}`}>
              Trend Intelligence
            </div>
            <h1 className="mt-2">{activeParameter ? formatParameterLabel(activeParameter) : "Trends"}</h1>
            <p className={isDark ? "text-slate-300" : "text-slate-600"}>{parameterSummary}</p>
          </div>
          <div className={`mobile-mini-count ${isDark ? "bg-white/[0.08]" : "bg-slate-100"}`}>
            <strong>{trends?.reports?.length || 0}</strong>
            <span>reports</span>
          </div>
        </div>
      </section>

      {trendsError ? (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-500">
          {trendsError.message || "Failed to load trends."}
        </div>
      ) : null}

      <section className={`mobile-card ${isDark ? "bg-slate-900/80 text-white" : "bg-white text-slate-950"}`}>
        <div className="mobile-section-title">
          <Filter size={18} />
          Marker
        </div>
        <div className="mobile-chip-row mt-4">
          {parameters.map((parameter) => (
            <button
              key={parameter}
              type="button"
              onClick={() => setSelectedParameter(parameter)}
              className={`mobile-filter-chip ${
                (selectedParameter || activeParameter) === parameter
                  ? "mobile-filter-active"
                  : isDark
                    ? "bg-white/[0.05] text-slate-300"
                    : "bg-slate-100 text-slate-700"
              }`}
            >
              {formatParameterLabel(parameter)}
            </button>
          ))}
        </div>
      </section>

      {activeParameter ? (
        <>
          <section className="mobile-stat-grid">
            <div className={`mobile-stat-card ${isDark ? "bg-blue-500/10 text-blue-200" : "bg-blue-50 text-blue-700"}`}>
              <div className="text-[0.68rem] font-black uppercase opacity-70">Latest</div>
              <div className="mt-2 text-2xl font-black leading-none">{latestPoint ? `${latestPoint.value} ${latestPoint.unit || ""}` : "--"}</div>
              <div className="mt-2 text-xs font-semibold opacity-75">{latestPoint?.status || "status pending"}</div>
            </div>
            <div className={`mobile-stat-card ${isDark ? "bg-emerald-500/10 text-emerald-200" : "bg-emerald-50 text-emerald-700"}`}>
              <div className="text-[0.68rem] font-black uppercase opacity-70">Direction</div>
              <div className="mt-2 text-2xl font-black leading-none">{getTrendArrow(activeMetric?.direction)} {activeMetric?.direction || "--"}</div>
              <div className="mt-2 text-xs font-semibold opacity-75">{activeMetric?.change || "change pending"}</div>
            </div>
            <div className={`mobile-stat-card ${isDark ? "bg-amber-500/10 text-amber-200" : "bg-amber-50 text-amber-700"}`}>
              <div className="text-[0.68rem] font-black uppercase opacity-70">Range</div>
              <div className="mt-2 text-2xl font-black leading-none">{minValue ?? "--"} - {maxValue ?? "--"}</div>
              <div className="mt-2 text-xs font-semibold opacity-75">recorded values</div>
            </div>
            <Link to={`/patient/parameter/${activeParameter}`} className={`mobile-stat-card ${isDark ? "bg-cyan-500/10 text-cyan-200" : "bg-cyan-50 text-cyan-700"}`}>
              <div className="text-[0.68rem] font-black uppercase opacity-70">Detail</div>
              <div className="mt-2 flex items-center gap-2 text-2xl font-black leading-none">
                Open <ArrowRight size={18} />
              </div>
              <div className="mt-2 text-xs font-semibold opacity-75">full history</div>
            </Link>
          </section>

          <section className={`mobile-card ${isDark ? "bg-slate-900/80 text-white" : "bg-white text-slate-950"}`}>
            <div className="mobile-section-title">
              <TrendingUp size={18} />
              Chart
            </div>
            <div className="mt-4 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trends?.table || []} margin={{ top: 8, right: 8, left: -18, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#1e293b" : "#e2e8f0"} />
                  <XAxis dataKey="date" stroke={isDark ? "#94a3b8" : "#64748b"} tick={{ fontSize: 10 }} />
                  <YAxis stroke={isDark ? "#94a3b8" : "#64748b"} tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey={activeParameter} stroke="#2563eb" strokeWidth={3} dot={{ r: 3 }} connectNulls />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className={`mobile-card ${isDark ? "bg-slate-900/80 text-white" : "bg-white text-slate-950"}`}>
            <div className="mobile-section-title">
              <Activity size={18} />
              Values
            </div>
            <div className="mt-4 space-y-3">
              {activeSeries.map((point, index) => (
                <div key={`${activeParameter}-${point.date}-${index}`} className={`mobile-timeline-row ${isDark ? "bg-white/[0.05]" : "bg-slate-50"}`}>
                  <div>
                    <strong>{point.value} {point.unit || ""}</strong>
                    <span>{point.date}</span>
                  </div>
                  <span className="text-xs font-black">{index === activeSeries.length - 1 ? activeMetric?.direction || "latest" : point.status || "history"}</span>
                </div>
              ))}
            </div>
          </section>
        </>
      ) : null}

      <section className={`mobile-card ${isDark ? "bg-slate-900/80 text-white" : "bg-white text-slate-950"}`}>
        <div className="mobile-section-title">
          <Sparkles size={18} />
          AI Reading
        </div>
        <div className="mt-4 space-y-3">
          {intelligenceBullets.length ? (
            intelligenceBullets.map((item, index) => (
              <div key={`${item}-${index}`} className={`rounded-2xl px-4 py-3 text-sm leading-6 ${isDark ? "bg-cyan-500/10 text-slate-200" : "bg-blue-50 text-slate-700"}`}>
                {item}
              </div>
            ))
          ) : (
            <div className={`${isDark ? "text-slate-500" : "text-slate-400"} text-sm`}>
              Upload more reports to generate comparative intelligence.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

export default function Trends() {
  const { isDark } = useTheme();
  const { isMobile } = useViewport();
  const [selectedParameter, setSelectedParameter] = useState("");
  const [viewMode, setViewMode] = useState("both");
  const { data, error: trendsError, isLoading: loading } = usePatientTrendsData();
  const trends = data?.trends || null;
  const insights = data?.insights || null;

  const parameters = useMemo(() => getOrderedParameters(trends), [trends]);
  React.useEffect(() => {
    if (!selectedParameter && parameters.length) {
      setSelectedParameter(parameters[0]);
    }
  }, [parameters, selectedParameter]);
  const activeParameter = selectedParameter || parameters[0] || "";
  const activeSeries = trends?.series?.[activeParameter] || [];
  const activeMetric = trends?.metrics?.[activeParameter];

  const minValue = activeSeries.length ? Math.min(...activeSeries.map((item) => item.value)) : null;
  const maxValue = activeSeries.length ? Math.max(...activeSeries.map((item) => item.value)) : null;
  const latestPoint = activeSeries[activeSeries.length - 1] || null;

  const parameterSummary =
    trends?.summary?.find((item) =>
      item.toLowerCase().includes(activeParameter.replaceAll("_", " ").toLowerCase())
    ) || "Comparative analysis updates as more reports are stored for this parameter.";

  const intelligenceBullets = useMemo(() => {
    return Array.from(
      new Set([...(trends?.summary || []), ...(insights?.summary || []), ...(insights?.key_findings || [])])
    ).slice(0, 6);
  }, [trends, insights]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <LoaderCircle size={28} className="animate-spin text-blue-500" />
      </div>
    );
  }

  if (isMobile) {
    return (
      <TrendsMobile
        isDark={isDark}
        trends={trends}
        trendsError={trendsError}
        parameters={parameters}
        activeParameter={activeParameter}
        activeSeries={activeSeries}
        activeMetric={activeMetric}
        latestPoint={latestPoint}
        minValue={minValue}
        maxValue={maxValue}
        parameterSummary={parameterSummary}
        intelligenceBullets={intelligenceBullets}
        selectedParameter={selectedParameter}
        setSelectedParameter={setSelectedParameter}
      />
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 px-4 md:px-0">
      <section className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 className={`text-4xl font-black tracking-tight ${isDark ? "text-white" : "text-slate-900"}`}>
            Trend Intelligence
          </h1>
          <p className={`${isDark ? "text-slate-400" : "text-slate-500"} mt-2 font-medium`}>
            Follow how key markers are moving over time, with clinical direction, stability, and AI-assisted interpretation.
          </p>
        </div>
        <div className={`rounded-2xl px-4 py-3 ${isDark ? "bg-white/5 text-slate-200" : "bg-white text-slate-700 shadow-sm"}`}>
          {trends?.reports?.length || 0} reports in active history
        </div>
      </section>

      {trendsError ? (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-500">
          {trendsError.message || "Failed to load trends."}
        </div>
      ) : null}

      <section className="grid grid-cols-1 xl:grid-cols-[1.2fr_0.8fr] gap-6">
        <div className={`rounded-[2rem] border p-6 ${isDark ? "bg-slate-900 border-white/10" : "bg-white border-slate-100"}`}>
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
            <div>
              <h2 className={`text-2xl font-black ${isDark ? "text-white" : "text-slate-900"}`}>
                {activeParameter ? formatParameterLabel(activeParameter) : "Parameter Trends"}
              </h2>
              <p className={`${isDark ? "text-slate-400" : "text-slate-500"} text-sm mt-1 max-w-2xl`}>
                {parameterSummary}
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <div className={`inline-flex items-center gap-2 rounded-2xl px-4 py-3 ${isDark ? "bg-white/5 text-slate-200" : "bg-slate-100 text-slate-700"}`}>
                <Filter size={16} />
                <select
                  value={activeParameter}
                  onChange={(event) => setSelectedParameter(event.target.value)}
                  className="bg-transparent outline-none font-semibold"
                >
                  {parameters.map((parameter) => (
                    <option key={parameter} value={parameter} className="text-slate-900">
                      {formatParameterLabel(parameter)}
                    </option>
                  ))}
                </select>
              </div>

              <div className={`inline-flex rounded-2xl p-1 ${isDark ? "bg-white/5" : "bg-slate-100"}`}>
                {["chart", "table", "both"].map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setViewMode(mode)}
                    className={`rounded-xl px-3 py-2 text-sm font-bold capitalize transition-colors ${
                      viewMode === mode
                        ? "bg-blue-600 text-white"
                        : isDark
                          ? "text-slate-300 hover:bg-white/5"
                          : "text-slate-700 hover:bg-white"
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {activeParameter ? (
            <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className={`rounded-2xl px-4 py-4 ${isDark ? "bg-white/5" : "bg-slate-50"}`}>
                <div className={`text-xs font-black uppercase tracking-[0.22em] ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                  Direction
                </div>
                <div className={`mt-2 text-lg font-black ${isDark ? "text-white" : "text-slate-900"}`}>
                  {getTrendArrow(activeMetric?.direction)} {activeMetric?.direction || "--"}
                </div>
              </div>
              <div className={`rounded-2xl px-4 py-4 ${isDark ? "bg-white/5" : "bg-slate-50"}`}>
                <div className={`text-xs font-black uppercase tracking-[0.22em] ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                  Change
                </div>
                <div className={`mt-2 text-lg font-black ${isDark ? "text-white" : "text-slate-900"}`}>
                  {activeMetric?.change || "--"}
                </div>
              </div>
              <div className={`rounded-2xl px-4 py-4 ${isDark ? "bg-white/5" : "bg-slate-50"}`}>
                <div className={`text-xs font-black uppercase tracking-[0.22em] ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                  Stability
                </div>
                <div className={`mt-2 text-lg font-black ${isDark ? "text-white" : "text-slate-900"}`}>
                  {activeMetric?.stability || "--"}
                </div>
              </div>
              <Link
                to={`/patient/parameter/${activeParameter}`}
                className={`rounded-2xl px-4 py-4 transition-colors ${isDark ? "bg-cyan-500/10 text-slate-200 hover:bg-cyan-500/15" : "bg-blue-50 text-blue-700 hover:bg-blue-100"}`}
              >
                <div className="text-xs font-black uppercase tracking-[0.22em] opacity-70">Detail Page</div>
                <div className="mt-2 inline-flex items-center gap-2 text-lg font-black">
                  Open Detail
                  <ArrowRight size={16} />
                </div>
              </Link>
            </div>
          ) : null}

          {(viewMode === "chart" || viewMode === "both") && activeParameter ? (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trends?.table || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#1e293b" : "#e2e8f0"} />
                  <XAxis dataKey="date" stroke={isDark ? "#94a3b8" : "#64748b"} />
                  <YAxis stroke={isDark ? "#94a3b8" : "#64748b"} />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey={activeParameter}
                    stroke="#3b82f6"
                    strokeWidth={3}
                    dot={{ r: 4 }}
                    connectNulls
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : null}

          {(viewMode === "table" || viewMode === "both") && activeParameter ? (
            <div className={`mt-6 overflow-hidden rounded-2xl border ${isDark ? "border-white/10" : "border-slate-200"}`}>
              <div className={`grid grid-cols-[0.9fr_0.8fr_0.8fr_0.8fr] gap-3 px-4 py-3 text-xs font-black uppercase tracking-[0.2em] ${isDark ? "bg-white/5 text-slate-500" : "bg-slate-50 text-slate-400"}`}>
                <div>Date</div>
                <div>Value</div>
                <div>Status</div>
                <div>Direction</div>
              </div>
              {activeSeries.map((point, index) => (
                <div
                  key={`${activeParameter}-${point.date}-${index}`}
                  className={`grid grid-cols-[0.9fr_0.8fr_0.8fr_0.8fr] gap-3 px-4 py-3 border-t text-sm ${isDark ? "border-white/10 text-slate-200" : "border-slate-200 text-slate-700"}`}
                >
                  <div>{point.date}</div>
                  <div>{point.value} {point.unit || ""}</div>
                  <div className="font-bold">{point.status || "unknown"}</div>
                  <div>{index === activeSeries.length - 1 ? `${getTrendArrow(activeMetric?.direction)} ${activeMetric?.direction || "stable"}` : "Historical"}</div>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <div className="space-y-6">
          <section className={`rounded-[2rem] border p-6 ${isDark ? "bg-slate-900 border-white/10" : "bg-white border-slate-100"}`}>
            <h2 className={`text-xl font-black mb-4 ${isDark ? "text-white" : "text-slate-900"}`}>Parameter Snapshot</h2>
            {activeParameter ? (
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Latest", value: latestPoint ? `${latestPoint.value} ${latestPoint.unit || ""}` : "--" },
                  { label: "Min", value: minValue ?? "--" },
                  { label: "Max", value: maxValue ?? "--" },
                  { label: "Trend", value: activeMetric?.direction || "--" },
                  { label: "Change", value: activeMetric?.change || "--" },
                  { label: "Stability", value: activeMetric?.stability_score != null ? `${activeMetric.stability_score}%` : "--" },
                  { label: "Status", value: latestPoint?.status || "--" },
                  { label: "Reports", value: activeSeries.length },
                ].map((item) => (
                  <div key={item.label} className={`rounded-2xl px-4 py-4 ${isDark ? "bg-white/5" : "bg-slate-50"}`}>
                    <div className={`text-xs font-black uppercase tracking-[0.22em] ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                      {item.label}
                    </div>
                    <div className={`mt-2 text-lg font-black ${isDark ? "text-white" : "text-slate-900"}`}>
                      {item.value}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className={`${isDark ? "text-slate-500" : "text-slate-400"}`}>No parameter data yet.</div>
            )}
          </section>

          <section className={`rounded-[2rem] border p-6 ${isDark ? "bg-slate-900 border-white/10" : "bg-white border-slate-100"}`}>
            <h2 className={`text-xl font-black mb-4 ${isDark ? "text-white" : "text-slate-900"}`}>AI Trend Interpretation</h2>
            <div className="space-y-3">
              {intelligenceBullets.length ? (
                intelligenceBullets.map((item, index) => (
                  <div
                    key={`${item}-${index}`}
                    className={`rounded-2xl px-4 py-3 ${isDark ? "bg-cyan-500/10 text-slate-200" : "bg-blue-50 text-slate-700"}`}
                  >
                    {item}
                  </div>
                ))
              ) : (
                <div className={`${isDark ? "text-slate-500" : "text-slate-400"} text-sm`}>
                  Upload more reports to generate comparative intelligence.
                </div>
              )}
            </div>
          </section>

          <section className={`rounded-[2rem] border p-6 ${isDark ? "bg-slate-900 border-white/10" : "bg-white border-slate-100"}`}>
            <div className="flex items-center gap-3 mb-4">
              <div className={`rounded-2xl p-3 ${badgeClasses(isDark, activeMetric?.direction === "decreasing" ? "negative" : "positive")}`}>
                <Sparkles size={16} />
              </div>
              <div>
                <h2 className={`text-xl font-black ${isDark ? "text-white" : "text-slate-900"}`}>Clinical Signal</h2>
                <p className={`${isDark ? "text-slate-400" : "text-slate-500"} text-sm`}>
                  A quick read on the latest direction and reliability of this trend.
                </p>
              </div>
            </div>
            <div className="space-y-3">
              <div className={`rounded-2xl px-4 py-3 ${badgeClasses(isDark, activeMetric?.direction === "decreasing" ? "negative" : "neutral")}`}>
                {activeMetric?.direction === "decreasing"
                  ? `${formatParameterLabel(activeParameter)} is trending downward in the current timeline.`
                  : activeMetric?.direction === "increasing"
                    ? `${formatParameterLabel(activeParameter)} is trending upward across recent reports.`
                    : `${formatParameterLabel(activeParameter)} is relatively stable across recorded reports.`}
              </div>
              <div className={`rounded-2xl px-4 py-3 ${badgeClasses(isDark, "neutral")}`}>
                Stability currently reads as <strong>{activeMetric?.stability || "unknown"}</strong>
                {activeMetric?.stability_score != null ? ` (${activeMetric.stability_score}%).` : "."}
              </div>
            </div>
          </section>
        </div>
      </section>

      {!parameters.length ? (
        <section className={`rounded-[2rem] border p-8 text-center ${isDark ? "bg-slate-900 border-white/10" : "bg-white border-slate-100"}`}>
          <Activity size={30} className="mx-auto mb-4 text-slate-400" />
          <p className={`${isDark ? "text-slate-400" : "text-slate-500"}`}>
            Your report timeline is still forming. Upload more reports to unlock parameter-level intelligence.
          </p>
        </section>
      ) : null}
    </div>
  );
}

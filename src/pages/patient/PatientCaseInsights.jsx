import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Activity, ArrowLeft, Brain, LoaderCircle, ShieldAlert, Sparkles, Stethoscope } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";
import caseService from "../../services/case.service";
import reportService from "../../services/report.service";
import { formatParameterLabel } from "../../utils/patientIntelligence";

export default function PatientCaseInsights() {
  const { isDark } = useTheme();
  const [cases, setCases] = useState([]);
  const [trends, setTrends] = useState(null);
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadInsights = async () => {
      try {
        const [caseData, trendData, insightData] = await Promise.all([
          caseService.getCases(),
          reportService.getTrends(),
          reportService.getInsights(),
        ]);
        setCases(caseData || []);
        setTrends(trendData);
        setInsights(insightData);
        setError("");
      } catch (loadError) {
        setError(loadError.message || "Failed to load consultation insights.");
      } finally {
        setLoading(false);
      }
    };

    loadInsights();
  }, []);

  const activeCases = useMemo(
    () => cases.filter((item) => ["pending", "open", "in_review"].includes(item.status)),
    [cases]
  );

  const topAnomalies = (trends?.anomalies || []).slice(0, 5);
  const keyFindings = Array.from(
    new Set([...(insights?.key_findings || []), ...(trends?.summary || []), ...(insights?.summary || [])])
  ).slice(0, 6);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <LoaderCircle size={28} className="animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 md:px-0">
      <section className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <Link
            to="/patient/cases"
            className={`inline-flex items-center gap-2 text-sm font-bold ${isDark ? "text-cyan-300" : "text-blue-700"}`}
          >
            <ArrowLeft size={16} />
            Back to Cases
          </Link>
          <h1 className={`mt-3 text-4xl font-black tracking-tight ${isDark ? "text-white" : "text-slate-900"}`}>
            Consultation Insights
          </h1>
          <p className={`mt-2 text-lg ${isDark ? "text-slate-400" : "text-slate-500"}`}>
            A clinical view of the intelligence powering your active consultations.
          </p>
        </div>
        <div className={`rounded-2xl px-4 py-3 ${isDark ? "bg-white/5 text-slate-200" : "bg-slate-100 text-slate-700"}`}>
          {activeCases.length} active consultation {activeCases.length === 1 ? "case" : "cases"}
        </div>
      </section>

      {error ? (
        <div className={`rounded-2xl px-4 py-3 text-sm font-semibold ${isDark ? "bg-red-500/10 text-red-300" : "bg-red-50 text-red-700"}`}>
          {error}
        </div>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className={`rounded-[2rem] border p-6 ${isDark ? "border-white/10 bg-slate-900" : "border-slate-100 bg-white shadow-lg shadow-slate-100/50"}`}>
          <div className="flex items-center gap-3">
            <div className={`rounded-2xl p-3 ${isDark ? "bg-cyan-500/10 text-cyan-300" : "bg-blue-50 text-blue-700"}`}>
              <Brain size={18} />
            </div>
            <div>
              <h2 className={`text-2xl font-black ${isDark ? "text-white" : "text-slate-900"}`}>AI Findings</h2>
              <p className={`${isDark ? "text-slate-400" : "text-slate-500"} text-sm`}>
                These findings summarize what your uploaded reports currently suggest.
              </p>
            </div>
          </div>
          <div className="mt-5 space-y-3">
            {keyFindings.length ? (
              keyFindings.map((item, index) => (
                <div
                  key={`${item}-${index}`}
                  className={`rounded-2xl px-4 py-4 ${isDark ? "bg-white/5 text-slate-200" : "bg-slate-50 text-slate-700"}`}
                >
                  {item}
                </div>
              ))
            ) : (
              <div className={`${isDark ? "text-slate-500" : "text-slate-400"}`}>No AI findings are available yet.</div>
            )}
          </div>
        </div>

        <div className={`rounded-[2rem] border p-6 ${isDark ? "border-white/10 bg-slate-900" : "border-slate-100 bg-white shadow-lg shadow-slate-100/50"}`}>
          <div className="flex items-center gap-3">
            <div className={`rounded-2xl p-3 ${isDark ? "bg-amber-500/10 text-amber-300" : "bg-amber-50 text-amber-700"}`}>
              <ShieldAlert size={18} />
            </div>
            <div>
              <h2 className={`text-2xl font-black ${isDark ? "text-white" : "text-slate-900"}`}>Anomalies</h2>
              <p className={`${isDark ? "text-slate-400" : "text-slate-500"} text-sm`}>
                Longitudinal changes and persistent abnormal markers that matter to the doctor review.
              </p>
            </div>
          </div>
          <div className="mt-5 space-y-3">
            {topAnomalies.length ? (
              topAnomalies.map((anomaly, index) => (
                <div
                  key={`${anomaly.parameter}-${index}`}
                  className={`rounded-2xl px-4 py-4 ${
                    anomaly.severity === "critical"
                      ? isDark
                        ? "bg-red-500/10 text-red-200"
                        : "bg-red-50 text-red-700"
                      : isDark
                        ? "bg-amber-500/10 text-amber-200"
                        : "bg-amber-50 text-amber-700"
                  }`}
                >
                  {anomaly.message}
                </div>
              ))
            ) : (
              <div className={`${isDark ? "text-slate-500" : "text-slate-400"}`}>No anomalies detected yet.</div>
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <div className={`rounded-[2rem] border p-6 ${isDark ? "border-white/10 bg-slate-900" : "border-slate-100 bg-white shadow-lg shadow-slate-100/50"}`}>
          <div className="flex items-center gap-3">
            <div className={`rounded-2xl p-3 ${isDark ? "bg-emerald-500/10 text-emerald-300" : "bg-emerald-50 text-emerald-700"}`}>
              <Stethoscope size={18} />
            </div>
            <div>
              <h2 className={`text-2xl font-black ${isDark ? "text-white" : "text-slate-900"}`}>Case Context</h2>
              <p className={`${isDark ? "text-slate-400" : "text-slate-500"} text-sm`}>
                Your doctors review these active and pending consultations against the health data below.
              </p>
            </div>
          </div>
          <div className="mt-5 space-y-3">
            {activeCases.length ? (
              activeCases.map((item) => (
                <div key={item.id} className={`rounded-2xl px-4 py-4 ${isDark ? "bg-white/5" : "bg-slate-50"}`}>
                  <div className={`font-bold ${isDark ? "text-white" : "text-slate-900"}`}>{item.title}</div>
                  <div className={`mt-1 text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                    {item.doctor?.full_name || "Doctor pending"} • <span className="capitalize">{item.status}</span>
                  </div>
                  <div className={`mt-2 text-sm ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                    {item.description || "Consultation details will appear here once the doctor begins the review."}
                  </div>
                </div>
              ))
            ) : (
              <div className={`${isDark ? "text-slate-500" : "text-slate-400"}`}>No active consultation cases yet.</div>
            )}
          </div>
        </div>

        <div className={`rounded-[2rem] border p-6 ${isDark ? "border-white/10 bg-slate-900" : "border-slate-100 bg-white shadow-lg shadow-slate-100/50"}`}>
          <div className="flex items-center gap-3">
            <div className={`rounded-2xl p-3 ${isDark ? "bg-white/5 text-slate-200" : "bg-slate-100 text-slate-700"}`}>
              <Activity size={18} />
            </div>
            <div>
              <h2 className={`text-2xl font-black ${isDark ? "text-white" : "text-slate-900"}`}>Trend Snapshot</h2>
              <p className={`${isDark ? "text-slate-400" : "text-slate-500"} text-sm`}>
                A quick summary of the latest tracked markers across your report history.
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {Object.entries(trends?.metrics || {}).slice(0, 6).map(([name, metric]) => (
              <div key={name} className={`rounded-2xl px-4 py-4 ${isDark ? "bg-white/5" : "bg-slate-50"}`}>
                <div className={`text-xs font-black uppercase tracking-[0.22em] ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                  {formatParameterLabel(name)}
                </div>
                <div className={`mt-2 text-lg font-black ${isDark ? "text-white" : "text-slate-900"}`}>
                  {metric.change || "--"}
                </div>
                <div className={`mt-1 text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                  {metric.direction} • {metric.stability || "unknown"}
                </div>
              </div>
            ))}
            {!Object.keys(trends?.metrics || {}).length ? (
              <div className={`${isDark ? "text-slate-500" : "text-slate-400"}`}>No trend metrics available yet.</div>
            ) : null}
          </div>

          <Link
            to="/patient/trends"
            className={`mt-5 inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold ${
              isDark ? "bg-white/5 text-slate-200 hover:bg-white/10" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            <Sparkles size={16} />
            Open Full Trends
          </Link>
        </div>
      </section>
    </div>
  );
}

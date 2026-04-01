import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AlertTriangle, ChevronLeft, LoaderCircle, TrendingUp } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";
import { getDoctorCase } from "../../services/doctor.service";
import usePatientInsightsBundle from "../../components/doctor/insights/usePatientInsightsBundle";
import TrendCharts from "../../components/doctor/insights/TrendCharts";
import InsightSummary from "../../components/doctor/insights/InsightSummary";
import ParameterGrid from "../../components/doctor/insights/ParameterGrid";
import TrendInsights from "../../components/doctor/insights/TrendInsights";
import HealthSummary from "../../components/doctor/insights/HealthSummary";
import InsightConfidence from "../../components/doctor/insights/InsightConfidence";
import HistoricalValuesTable from "../../components/doctor/insights/HistoricalValuesTable";
import ReportCoverage from "../../components/doctor/insights/ReportCoverage";

function SectionCard({ title, icon: Icon, isDark, children }) {
  return (
    <section className={`rounded-[1.8rem] border p-5 ${isDark ? "border-white/10 bg-white/[0.03]" : "border-slate-200 bg-slate-50/80"}`}>
      <div className="flex items-center gap-2 text-lg font-black">
        {Icon ? <Icon size={18} /> : null}
        {title}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export default function DoctorCaseInsights() {
  const { isDark } = useTheme();
  const { id } = useParams();
  const [caseItem, setCaseItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const patientId = caseItem?.patient?.id || null;
  const {
    trends,
    insights,
    loading: insightsLoading,
    error: insightsError,
  } = usePatientInsightsBundle(patientId);

  useEffect(() => {
    const loadCase = async () => {
      if (!id) return;
      try {
        const caseData = await getDoctorCase(id);
        setCaseItem(caseData);
        setError("");
      } catch (loadError) {
        setError(loadError.message || "Failed to load case insights.");
      } finally {
        setLoading(false);
      }
    };

    loadCase();
  }, [id]);

  if (loading) {
    return (
      <div className="flex min-h-[55vh] items-center justify-center">
        <LoaderCircle size={28} className="animate-spin text-cyan-400" />
      </div>
    );
  }

  if (!caseItem) {
    return (
      <div className={`rounded-[1.8rem] border p-6 ${isDark ? "border-white/10 bg-white/[0.03] text-slate-300" : "border-slate-200 bg-slate-50 text-slate-600"}`}>
        {error || "Case insights could not be loaded."}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            to={`/doctor/case/${caseItem.id}`}
            className={`inline-flex items-center gap-2 text-sm font-bold ${isDark ? "text-cyan-300" : "text-blue-700"}`}
          >
            <ChevronLeft size={16} />
            Back to Case
          </Link>
          <h1 className={`mt-3 text-4xl font-black tracking-tight ${isDark ? "text-white" : "text-slate-900"}`}>
            {caseItem.patient?.full_name || "Patient Case"} Insights
          </h1>
          <p className={`mt-2 text-base ${isDark ? "text-slate-400" : "text-slate-500"}`}>
            Read-only patient intelligence built from stored insights and trend history.
          </p>
        </div>
      </div>

      {error ? (
        <div className={`rounded-2xl px-4 py-3 text-sm font-semibold ${isDark ? "bg-red-500/10 text-red-300" : "bg-red-50 text-red-700"}`}>
          {error}
        </div>
      ) : null}
      {insightsError ? (
        <div className={`rounded-2xl px-4 py-3 text-sm font-semibold ${isDark ? "bg-red-500/10 text-red-300" : "bg-red-50 text-red-700"}`}>
          {insightsError}
        </div>
      ) : null}

      {insightsLoading ? (
        <div className="flex min-h-[55vh] items-center justify-center">
          <LoaderCircle size={28} className="animate-spin text-cyan-400" />
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 xl:grid-cols-[0.95fr_0.8fr_1.05fr]">
            <HealthSummary trends={trends} insights={insights} isDark={isDark} />
            <InsightConfidence trends={trends} insights={insights} isDark={isDark} />
            <SectionCard title="Clinical Alerts" icon={AlertTriangle} isDark={isDark}>
              <div className="space-y-3">
                {(trends?.anomalies || []).slice(0, 6).map((anomaly, index) => (
                  <div
                    key={`${anomaly.parameter || "alert"}-${index}`}
                    className={`rounded-2xl px-4 py-3 text-sm ${
                      anomaly.severity === "critical"
                        ? isDark ? "bg-red-500/10 text-red-200" : "bg-red-50 text-red-700"
                        : isDark ? "bg-amber-500/10 text-amber-200" : "bg-amber-50 text-amber-700"
                    }`}
                  >
                    {anomaly.message}
                  </div>
                ))}
                {!trends?.anomalies?.length ? (
                  <div className={`rounded-2xl px-4 py-3 text-sm ${isDark ? "bg-white/5 text-slate-400" : "bg-white text-slate-500"}`}>
                    No anomaly alerts were detected for this patient.
                  </div>
                ) : null}
              </div>
            </SectionCard>
          </div>

          <SectionCard title="Insights & Trends" icon={TrendingUp} isDark={isDark}>
            <div className="space-y-6">
              <InsightSummary insights={insights} trends={trends} isDark={isDark} />
              <TrendCharts trends={trends} isDark={isDark} />
              <ParameterGrid trends={trends} isDark={isDark} />
              <TrendInsights trends={trends} isDark={isDark} />
            </div>
          </SectionCard>

          <SectionCard title="Historical Evaluation Matrix" icon={TrendingUp} isDark={isDark}>
            <div className="space-y-6">
              <HistoricalValuesTable trends={trends} isDark={isDark} />
              <ReportCoverage trends={trends} reports={caseItem.reports || []} isDark={isDark} />
            </div>
          </SectionCard>
        </div>
      )}
    </div>
  );
}

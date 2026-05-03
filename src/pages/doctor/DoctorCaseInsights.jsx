import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AlertTriangle, ChevronLeft, LoaderCircle, TrendingUp } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";
import useViewport from "../../hooks/useViewport";
import MobileSparkline from "../../components/ui/MobileSparkline";
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


// ─── Native Mobile Port ───────────────────────────────────────────────────────
function DoctorCaseInsightsMobile({ caseItem, trends, insights, isDark, loading, error, insightsLoading, insightsError }) {
  if (loading || insightsLoading) {
    return (
      <div className="flex flex-col min-h-[100svh] items-center justify-center pb-24">
        <LoaderCircle size={28} className="animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className={`flex flex-col min-h-[100svh] w-full font-sans antialiased ${isDark ? 'bg-black text-white' : 'bg-[#F2F2F7] text-black'} pb-24`}>
      <header className="px-4 pt-12 pb-6">
        <Link to={`/doctor/case/${caseItem?.id}`} className="text-blue-500 font-bold mb-2 inline-flex items-center gap-1 active-feedback touch-target"><ChevronLeft size={20}/> Back</Link>
        <h1 className="text-4xl font-bold tracking-tight">{caseItem?.patient?.full_name}</h1>
        <p className={`mt-1 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
          Patient Insights
        </p>
      </header>
      
      <main className="px-4 space-y-6">
        <section className={`rounded-3xl p-5 ${isDark ? 'bg-[#1C1C1E]' : 'bg-white shadow-sm'}`}>
          <h2 className="text-xl font-bold mb-3">Clinical Alerts</h2>
          <div className="flex overflow-x-auto snap-x snap-mandatory gap-3 pb-2 -mx-5 px-5 hide-scrollbar">
             {(trends?.anomalies || []).length > 0 ? (trends?.anomalies || []).slice(0, 6).map((anomaly, idx) => (
                <div key={idx} className={`shrink-0 snap-center min-w-[200px] p-4 rounded-2xl ${anomaly.severity === 'critical' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>
                  <AlertTriangle size={24} className="mb-2" />
                  <p className="text-sm font-semibold">{anomaly.message}</p>
                </div>
             )) : <div className="text-gray-500">No alerts</div>}
          </div>
        </section>
        
        <section>
          <h2 className="text-xl font-bold mb-3 px-1">Trend Quick View</h2>
          <div className="space-y-4">
             {Object.keys(trends?.series || {}).slice(0,4).map(param => {
               const data = trends.series[param] || [];
               const latest = data.length ? data[data.length-1] : null;
               const metric = trends.metrics?.[param];
               const statusColor = (latest?.status === 'low' || latest?.status === 'high') ? 'text-orange-500' : 'text-emerald-500';
               const strokeColor = (latest?.status === 'low' || latest?.status === 'high') ? '#f97316' : '#10b981';
               
               return (
                 <Link to={`/doctor/case/${caseItem?.id}`} key={param} className={`block rounded-[1.5rem] p-5 active-feedback transition-all ${isDark ? 'bg-[#1C1C1E]' : 'bg-white shadow-sm'}`}>
                   <div className="text-[32px] leading-none font-bold tabular-nums flex items-baseline gap-1">
                     {latest ? latest.value : '--'} <span className="text-xs font-normal text-gray-400">{latest?.unit || ''}</span>
                   </div>
                   <div className="text-[13px] font-semibold text-gray-500 mt-2 capitalize">{param.replace('_', ' ')}</div>
                   <div className={`mt-1.5 text-[12px] font-bold flex items-center gap-1 ${statusColor}`}>
                      {(latest?.status === 'low' || latest?.status === 'high') ? '↓ ' : '↑ '}
                      {latest?.status || 'stable'}
                   </div>
                   <div className="h-20 mt-4 -mx-1 opacity-80">
                     <MobileSparkline data={data.map(d=>d.value)} color={strokeColor} height={80} strokeWidth={3} />
                   </div>
                 </Link>
               )
             })}
          </div>
        </section>
      </main>
    </div>
  );
}

export default function DoctorCaseInsights() {
  const { isDark } = useTheme();
  const { isMobile } = useViewport();
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

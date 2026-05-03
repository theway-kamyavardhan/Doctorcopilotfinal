import React, { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, CalendarDays, Download, FileText, LoaderCircle, Microscope, TrendingUp, Upload } from "lucide-react";
import { motion } from "framer-motion";
import { useTheme } from "../../context/ThemeContext";
import HealthBar from "../../components/patient/HealthBar";
import SignalStream from "../../components/patient/SignalStream";
import PatientContextPanel from "../../components/patient/PatientContextPanel";
import DataStrip from "../../components/patient/DataStrip";
import TimelineRibbon from "../../components/patient/TimelineRibbon";
import SystemPanel from "../../components/patient/SystemPanel";
import {
  buildAlertItems,
  calculateHealthScore,
  getLatestParameter,
  getLatestReport,
} from "../../utils/patientIntelligence";
import ExportService from "../../services/ExportService";
import usePatientDashboardData from "../../hooks/usePatientDashboardData";

// ─── Helper sub-components ────────────────────────────────────────────────────

function HeroAction({ to, icon: Icon, label, isDark }) {
  return (
    <Link
      to={to}
      className={`inline-flex items-center gap-2 rounded-full px-4 py-3 text-sm font-bold transition-colors min-h-[48px] ${
        isDark ? "bg-slate-900 text-slate-200 hover:bg-slate-800" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
      }`}
    >
      <Icon size={15} />
      {label}
    </Link>
  );
}

function StartTimelinePanel({ isDark, onUpload }) {
  return (
    <section
      className={`relative overflow-hidden rounded-[2rem] border px-5 py-5 sm:px-6 sm:py-6 ${
        isDark
          ? "border-white/8 bg-slate-900/55 shadow-[0_28px_80px_rgba(2,6,23,0.45)]"
          : "border-white/70 bg-white/60 shadow-[0_24px_80px_rgba(15,23,42,0.08)]"
      } backdrop-blur-2xl`}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.14),_transparent_44%)]" />
      <div className="relative flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-4">
          <div className="rounded-[1.4rem] bg-blue-500/10 p-4 text-blue-500 shrink-0">
            <Microscope size={24} />
          </div>
          <div>
            <div className={`text-[11px] font-black uppercase tracking-[0.3em] ${isDark ? "text-slate-500" : "text-slate-400"}`}>
              Activate Timeline
            </div>
            <p className={`mt-2 text-sm leading-7 ${isDark ? "text-slate-300" : "text-slate-600"}`}>
              Upload your first report and DoctorCopilot will start building a living health history, structured trends, and AI-driven summaries automatically.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onUpload}
          style={{ touchAction: "manipulation" }}
          className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-5 py-3 font-bold text-white transition-colors hover:bg-blue-500 min-h-[48px] shrink-0"
        >
          Upload First Report
          <ArrowRight size={16} />
        </button>
      </div>
    </section>
  );
}

function statusToSubsystemScore(status) {
  const normalized = String(status || "").toLowerCase();
  if (normalized === "normal" || normalized === "sufficient") return 86;
  if (normalized === "insufficient") return 54;
  if (normalized === "low" || normalized === "high") return 48;
  if (normalized === "deficient" || normalized === "critical") return 28;
  return null;
}

function averageScores(values, fallback) {
  const valid = values.filter((v) => typeof v === "number");
  if (!valid.length) return fallback;
  return Math.round(valid.reduce((sum, v) => sum + v, 0) / valid.length);
}

function buildSubsystemStats(reports, fallbackScore) {
  const latestReport = getLatestReport(reports);
  const parameterMap = new Map((latestReport?.parameters || []).map((item) => [item.name, item]));

  const bloodHealth = averageScores(
    ["hemoglobin","platelets","red_blood_cells","white_blood_cells"].map((k) => statusToSubsystemScore(parameterMap.get(k)?.status)),
    fallbackScore
  );
  const vitaminStability = averageScores(
    ["vitamin_b12","vitamin_d","iron"].map((k) => statusToSubsystemScore(parameterMap.get(k)?.status)),
    Math.max(fallbackScore - 8, 24)
  );
  const immuneStrength = averageScores(
    ["white_blood_cells","lymphocytes","neutrophils"].map((k) => statusToSubsystemScore(parameterMap.get(k)?.status)),
    Math.max(fallbackScore - 4, 30)
  );

  return [
    { label: "Blood Health",     value: bloodHealth     },
    { label: "Vitamin Stability",value: vitaminStability },
    { label: "Immune Strength",  value: immuneStrength  },
  ];
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function PatientDashboard() {
  const { isDark } = useTheme();
  const navigate   = useNavigate();
  const [exportError, setExportError] = useState("");
  const [exporting, setExporting]     = useState(false);

  const { data, error: dashboardError, isLoading: loading } = usePatientDashboardData();
  const profile      = data?.profile      || null;
  const reports      = data?.reports      || [];
  const trends       = data?.trends       || null;
  const insights     = data?.insights     || null;
  const cases        = data?.cases        || [];
  const appointments = data?.appointments || [];

  const isNewUser   = reports.length === 0;
  const healthScore = useMemo(() => calculateHealthScore(reports, trends, insights), [reports, trends, insights]);
  const subsystemStats = useMemo(() => buildSubsystemStats(reports, healthScore.score), [reports, healthScore.score]);
  const alerts      = useMemo(() => buildAlertItems(reports, trends, insights), [reports, trends, insights]);
  const anomalies   = (trends?.anomalies || []).slice(0, 6);

  const activeCase = useMemo(
    () => cases.find((c) => ["pending","open","in_review"].includes(c.status)) || null,
    [cases]
  );

  const abnormalParameterCount = useMemo(
    () => reports.reduce((count, r) => count + (r.parameters || []).filter((p) =>
      ["low","high","deficient","insufficient"].includes(String(p.status || p.interpretation || "").toLowerCase())
    ).length, 0),
    [reports]
  );

  const categoryCount = useMemo(
    () => new Set(reports.map((r) => r.report_category).filter(Boolean)).size,
    [reports]
  );

  const upcomingAppointments = useMemo(
    () => appointments
      .filter((a) => a.status === "scheduled" && new Date(a.date_time) >= new Date())
      .sort((a, b) => new Date(a.date_time) - new Date(b.date_time))
      .slice(0, 3),
    [appointments]
  );

  const overallTrendDirection = useMemo(() => {
    const metrics = Object.values(trends?.metrics || {});
    if (!metrics.length) return "stable";
    const inc = metrics.filter((m) => m.direction === "increasing").length;
    const dec = metrics.filter((m) => m.direction === "decreasing").length;
    return dec > inc ? "decreasing" : inc > dec ? "increasing" : "stable";
  }, [trends]);

  const stripMetrics = useMemo(() => {
    const palette = { hemoglobin:"#3b82f6", platelets:"#14b8a6", vitamin_b12:"#f59e0b", white_blood_cells:"#a855f7" };
    return ["hemoglobin","platelets","vitamin_b12","white_blood_cells"].map((name) => {
      const latest = getLatestParameter(reports, name);
      if (!latest) return null;
      return {
        ...latest,
        color: palette[name] || "#38bdf8",
        history: (trends?.series?.[name] || []).map((p) => p.value).slice(-6),
        direction: trends?.metrics?.[name]?.direction || "stable",
      };
    }).filter(Boolean);
  }, [reports, trends]);

  const handleExport = async () => {
    try {
      setExportError("");
      setExporting(true);
      await ExportService.exportAiHealthSummary();
    } catch (error) {
      setExportError(error.message || "Unable to download your AI health summary PDF.");
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <LoaderCircle size={28} className="animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="relative mx-auto max-w-[88rem] px-2 pb-10 sm:px-4 md:px-2">
      {/* Ambient blobs */}
      <div className="pointer-events-none absolute -left-24 top-0 h-80 w-80 rounded-full bg-cyan-500/12 blur-3xl" />
      <div className="pointer-events-none absolute right-0 top-28 h-96 w-96 rounded-full bg-emerald-500/10 blur-3xl" />
      <div className="pointer-events-none absolute left-1/3 top-60 h-72 w-72 rounded-full bg-amber-300/10 blur-3xl" />

      <div className="relative space-y-5 sm:space-y-6">

        {/* ── Hero header ── */}
        <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className={`text-2xl font-black tracking-tight sm:text-3xl md:text-[3.4rem] ${isDark ? "text-white" : "text-slate-900"}`}
            >
              {profile?.user?.full_name || "Your Personal Health System"}
            </motion.h1>
            <p className={`mt-2 sm:mt-3 text-sm sm:text-lg leading-7 sm:leading-8 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
              Your health system is currently under analysis.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 sm:gap-3">
            <HeroAction to="/patient/trends" icon={TrendingUp} label="Open Trends" isDark={isDark} />
            <button
              type="button"
              onClick={handleExport}
              disabled={exporting}
              style={{ touchAction: "manipulation" }}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-3 text-sm font-bold transition-colors min-h-[48px] ${isDark ? "bg-slate-900 text-slate-200 hover:bg-slate-800 disabled:opacity-70" : "bg-slate-100 text-slate-700 hover:bg-slate-200 disabled:opacity-70"}`}
            >
              {exporting ? <LoaderCircle size={15} className="animate-spin" /> : <Download size={15} />}
              {exporting ? "Preparing PDF" : "Export AI Summary"}
            </button>
          </div>
        </section>

        {isNewUser && <StartTimelinePanel isDark={isDark} onUpload={() => navigate("/patient/reports")} />}

        {(exportError || dashboardError) && (
          <div className="rounded-[1.5rem] border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-500">
            {exportError || dashboardError?.message || "Failed to load your health system."}
          </div>
        )}

        {/* ── 3-panel row ── */}
        <section className="grid gap-5 sm:gap-6 xl:grid-cols-[0.9fr_1.25fr_0.9fr] xl:items-start">
          <PatientContextPanel profile={profile} reports={reports} trends={trends} insights={insights} isDark={isDark} />
          <HealthBar
            score={healthScore.score}
            status={healthScore.status}
            explanation={healthScore.explanation}
            reasons={healthScore.reasons}
            trendDirection={overallTrendDirection}
            subStats={subsystemStats}
            isDark={isDark}
          />
          <SignalStream alerts={alerts} anomalies={anomalies} isDark={isDark} />
        </section>

        {/* ── Data strip ── */}
        <DataStrip metrics={stripMetrics} isDark={isDark} />

        <div className="px-1">
          <p className={`text-sm leading-7 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
            The timeline ribbon below shows where your health story shifted. The operations panel beside it explains how those shifts connect to your current care state.
          </p>
        </div>

        {/* ── Timeline + system panel ── */}
        <section className="grid gap-5 sm:gap-6 xl:grid-cols-[1.24fr_0.76fr] xl:items-start">
          <TimelineRibbon reports={reports} isDark={isDark} />
          <SystemPanel
            reportsCount={reports.length}
            abnormalCount={abnormalParameterCount}
            conditionsCount={alerts.length}
            categoryCount={categoryCount}
            upcomingAppointments={upcomingAppointments}
            activeCase={activeCase}
            isDark={isDark}
          />
        </section>

      </div>
    </div>
  );
}

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  AlertTriangle,
  Brain,
  CalendarDays,
  ChevronLeft,
  Clock3,
  Download,
  FileSearch,
  FileText,
  LoaderCircle,
  MessageSquare,
  ShieldCheck,
  TrendingUp,
  X,
} from "lucide-react";
import { useTheme } from "../../context/ThemeContext";
import { getDoctorCase, requestDoctorReportAccess } from "../../services/doctor.service";
import appointmentService from "../../services/appointment.service";
import ExportService from "../../services/ExportService";
import { buildClinicalInterpretation, formatParameterLabel } from "../../utils/patientIntelligence";
import OriginalReportViewer from "../../components/doctor/OriginalReportViewer";
import usePatientInsightsBundle from "../../components/doctor/insights/usePatientInsightsBundle";
import InsightSummary from "../../components/doctor/insights/InsightSummary";
import HealthSummary from "../../components/doctor/insights/HealthSummary";

function formatDateTime(value) {
  if (!value) return "Not scheduled";
  return new Date(value).toLocaleString();
}

function formatStatusLabel(value) {
  return String(value || "pending")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function getStatusTone(status, isDark) {
  switch (status) {
    case "open":
    case "in_review":
      return isDark
        ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-200"
        : "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "closed":
      return isDark
        ? "border-slate-600/40 bg-slate-800/80 text-slate-200"
        : "border-slate-200 bg-slate-100 text-slate-700";
    default:
      return isDark
        ? "border-amber-400/20 bg-amber-500/10 text-amber-200"
        : "border-amber-200 bg-amber-50 text-amber-700";
  }
}

function SectionCard({ title, icon: Icon, isDark, children, action = null }) {
  return (
    <section className={`rounded-[1.8rem] border p-6 ${isDark ? "border-white/10 bg-white/[0.03]" : "border-slate-200 bg-slate-50/80"}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-lg font-black">
          {Icon ? <Icon size={18} /> : null}
          {title}
        </div>
        {action}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function SnapshotItem({ label, value, subvalue, isDark }) {
  return (
    <div className={`rounded-2xl border px-4 py-4 ${isDark ? "border-white/10 bg-white/[0.04]" : "border-slate-200 bg-white/90"}`}>
      <div className={`text-[11px] font-black uppercase tracking-[0.2em] ${isDark ? "text-slate-500" : "text-slate-400"}`}>
        {label}
      </div>
      <div className={`mt-2 text-lg font-black ${isDark ? "text-white" : "text-slate-900"}`}>{value}</div>
      {subvalue ? <div className={`mt-1 text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>{subvalue}</div> : null}
    </div>
  );
}

function normalizeReportForInterpretation(report) {
  return {
    ...report,
    insights: (report.insights || []).map((item) => (typeof item === "string" ? { description: item } : item)),
  };
}

function reportSummaryBullets(report) {
  const interpreted = buildClinicalInterpretation(normalizeReportForInterpretation(report));
  const aiInsights = (report.insights || []).filter(Boolean);
  return Array.from(new Set([...interpreted, ...aiInsights, report.summary].filter(Boolean))).slice(0, 5);
}

function getReportMetadata(report) {
  const metadata = report.report_metadata || {};
  const lab = metadata.lab || {};
  const patient = metadata.patient || {};

  return {
    patientName: patient.full_name || report.patient_name || "Unknown patient",
    labName: lab.lab_name || report.lab_name || "Unknown lab",
    labAddress: lab.address || lab.location || "Location not available",
    reportDate: report.report_date || "Date pending",
    reportType: report.report_type || "Clinical Report",
    fileName: report.file_name || "Uploaded report",
  };
}

function LinkedReportCard({ report, isDark, onOpen }) {
  const metadata = getReportMetadata(report);
  const aiSummary = reportSummaryBullets(report);

  return (
    <button
      type="button"
      onClick={() => onOpen(report)}
      className={`w-full rounded-2xl border p-5 text-left transition-all ${
        isDark
          ? "border-white/10 bg-white/[0.03] hover:border-cyan-400/30 hover:bg-white/[0.05]"
          : "border-slate-200 bg-white hover:border-blue-300 hover:bg-slate-50"
      }`}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <div className={`text-xs font-black uppercase tracking-[0.22em] ${isDark ? "text-slate-500" : "text-slate-400"}`}>
            {metadata.reportType}
          </div>
          <div className={`text-xl font-black ${isDark ? "text-white" : "text-slate-900"}`}>{metadata.labName}</div>
          <div className={`text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>
            {[metadata.reportDate, metadata.fileName, metadata.labAddress].filter(Boolean).join(" | ")}
          </div>
          <div className={`text-sm leading-7 ${isDark ? "text-slate-300" : "text-slate-600"}`}>
            {aiSummary[0] || report.summary || "Structured report ready for review."}
          </div>
        </div>

        <div className={`inline-flex rounded-full px-3 py-1 text-xs font-black uppercase tracking-[0.16em] ${isDark ? "bg-cyan-500/10 text-cyan-200" : "bg-cyan-50 text-cyan-700"}`}>
          Open Report
        </div>
      </div>
    </button>
  );
}

function ReportOverlay({
  report,
  isDark,
  viewMode,
  onViewChange,
  exportMenuOpen,
  onToggleExportMenu,
  onExport,
  exportingKey,
  onClose,
}) {
  if (!report || typeof document === "undefined") return null;

  const metadata = getReportMetadata(report);
  const aiSummary = reportSummaryBullets(report);
  const isExportingAi = exportingKey === `${report.id}:ai`;
  const isExportingSource = exportingKey === `${report.id}:source`;

  return createPortal(
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/70 px-4 py-8">
      <div className={`w-full max-w-6xl rounded-[2rem] border shadow-2xl ${isDark ? "border-white/10 bg-slate-950 text-white" : "border-slate-200 bg-white text-slate-900"}`}>
        <div className={`flex flex-wrap items-start justify-between gap-4 border-b px-6 py-5 ${isDark ? "border-white/10" : "border-slate-200"}`}>
          <div>
            <div className={`text-xs font-black uppercase tracking-[0.22em] ${isDark ? "text-cyan-300/80" : "text-blue-700/75"}`}>
              Linked Report
            </div>
            <h2 className="mt-2 text-2xl font-black">{metadata.reportType}</h2>
            <p className={`mt-2 text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>
              {[metadata.reportDate, metadata.labName, metadata.fileName].filter(Boolean).join(" | ")}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => onViewChange("ai")}
              className={`rounded-xl px-4 py-2 text-sm font-bold transition-colors ${
                viewMode === "ai"
                  ? "bg-blue-600 text-white"
                  : isDark
                    ? "bg-white/5 text-slate-200 hover:bg-white/10"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              <Brain size={14} className="mr-2 inline-flex" />
              AI Summary
            </button>
            <button
              type="button"
              onClick={() => onViewChange("raw")}
              className={`rounded-xl px-4 py-2 text-sm font-bold transition-colors ${
                viewMode === "raw"
                  ? "bg-blue-600 text-white"
                  : isDark
                    ? "bg-white/5 text-slate-200 hover:bg-white/10"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              <FileText size={14} className="mr-2 inline-flex" />
              Original Report
            </button>
            <div className="relative">
              <button
                type="button"
                onClick={() => onToggleExportMenu(exportMenuOpen ? "" : report.id)}
                className={`rounded-xl px-4 py-2 text-sm font-bold transition-colors ${
                  isDark ? "bg-white/5 text-slate-200 hover:bg-white/10" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                <Download size={14} className="mr-2 inline-flex" />
                Export
              </button>

              {exportMenuOpen ? (
                <div className={`absolute right-0 top-full z-20 mt-2 w-44 rounded-2xl border p-2 shadow-xl ${isDark ? "border-white/10 bg-slate-950" : "border-slate-200 bg-white"}`}>
                  <button
                    type="button"
                    onClick={() => onExport(report.id, "ai")}
                    disabled={isExportingAi || isExportingSource}
                    className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm font-semibold ${isDark ? "text-slate-200 hover:bg-white/5" : "text-slate-700 hover:bg-slate-100"}`}
                  >
                    AI PDF
                    {isExportingAi ? <LoaderCircle size={14} className="animate-spin" /> : null}
                  </button>
                  <button
                    type="button"
                    onClick={() => onExport(report.id, "source")}
                    disabled={isExportingAi || isExportingSource}
                    className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm font-semibold ${isDark ? "text-slate-200 hover:bg-white/5" : "text-slate-700 hover:bg-slate-100"}`}
                  >
                    Source PDF
                    {isExportingSource ? <LoaderCircle size={14} className="animate-spin" /> : null}
                  </button>
                </div>
              ) : null}
            </div>
            <button
              type="button"
              onClick={onClose}
              className={`inline-flex items-center justify-center rounded-2xl p-3 transition-colors ${
                isDark ? "bg-white/5 text-slate-300 hover:bg-white/10" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
              aria-label="Close report overlay"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="max-h-[78vh] overflow-y-auto px-6 py-6">
          {viewMode === "ai" ? (
            <div className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
              <div className="space-y-4">
                <div>
                  <div className={`text-xs font-black uppercase tracking-[0.2em] ${isDark ? "text-slate-500" : "text-slate-400"}`}>AI Clinical Summary</div>
                  <div className="mt-3 space-y-3">
                    {aiSummary.length ? (
                      aiSummary.map((item, index) => (
                        <div
                          key={`${report.id}-summary-${index}`}
                          className={`rounded-2xl px-4 py-3 text-sm leading-7 ${isDark ? "bg-cyan-500/10 text-slate-200" : "bg-blue-50 text-slate-700"}`}
                        >
                          {item}
                        </div>
                      ))
                    ) : (
                      <div className={`rounded-2xl px-4 py-3 text-sm ${isDark ? "bg-white/5 text-slate-400" : "bg-slate-50 text-slate-500"}`}>
                        No AI summary is available for this report yet.
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <div className={`text-xs font-black uppercase tracking-[0.2em] ${isDark ? "text-slate-500" : "text-slate-400"}`}>Report Metadata</div>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    {[
                      ["Patient", metadata.patientName],
                      ["Lab", metadata.labName],
                      ["Location", metadata.labAddress],
                      ["Report Date", metadata.reportDate],
                    ].map(([label, value]) => (
                      <div key={`${report.id}-${label}`} className={`rounded-2xl px-4 py-3 ${isDark ? "bg-white/5" : "bg-slate-50"}`}>
                        <div className={`text-xs font-black uppercase tracking-[0.2em] ${isDark ? "text-slate-500" : "text-slate-400"}`}>{label}</div>
                        <div className={`mt-2 text-sm font-semibold ${isDark ? "text-slate-200" : "text-slate-700"}`}>{value}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <div className={`text-xs font-black uppercase tracking-[0.2em] ${isDark ? "text-slate-500" : "text-slate-400"}`}>Structured Parameters</div>
                <div className={`mt-3 overflow-hidden rounded-2xl border ${isDark ? "border-white/10" : "border-slate-200"}`}>
                  <div className={`grid grid-cols-[1.2fr_0.8fr_1fr_0.8fr] gap-3 px-4 py-3 text-xs font-black uppercase tracking-[0.2em] ${isDark ? "bg-white/5 text-slate-500" : "bg-slate-50 text-slate-400"}`}>
                    <div>Parameter</div>
                    <div>Value</div>
                    <div>Range</div>
                    <div>Status</div>
                  </div>
                  {(report.parameters || []).length ? (
                    report.parameters.map((parameter, index) => (
                      <div
                        key={`${report.id}-${parameter.name}-${index}`}
                        className={`grid grid-cols-[1.2fr_0.8fr_1fr_0.8fr] gap-3 border-t px-4 py-3 text-sm ${isDark ? "border-white/10 text-slate-200" : "border-slate-200 text-slate-700"}`}
                      >
                        <div className="font-semibold">{formatParameterLabel(parameter.name)}</div>
                        <div>{parameter.value} {parameter.unit || ""}</div>
                        <div>{parameter.reference_range || "-"}</div>
                        <div className="font-bold">{parameter.status || parameter.interpretation || "unknown"}</div>
                      </div>
                    ))
                  ) : (
                    <div className={`px-4 py-5 text-sm ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                      No structured parameters were stored for this report.
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <OriginalReportViewer reportId={report.id} mimeType={report.mime_type} isDark={isDark} />
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

export default function DoctorCaseView() {
  const { isDark } = useTheme();
  const { id } = useParams();
  const navigate = useNavigate();
  const [caseItem, setCaseItem] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [requestingAccess, setRequestingAccess] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [reportViewMode, setReportViewMode] = useState("ai");
  const [openExportMenuId, setOpenExportMenuId] = useState("");
  const [exportingKey, setExportingKey] = useState("");
  const [error, setError] = useState("");

  const patientId = caseItem?.patient?.id || null;
  const { trends, insights, loading: insightsLoading, error: insightsError } = usePatientInsightsBundle(patientId);

  const loadCaseWorkspace = async () => {
    if (!id) return;

    try {
      const caseData = await getDoctorCase(id);
      setCaseItem(caseData);
      const appointmentData = await appointmentService.getDoctorAppointments();
      setAppointments((appointmentData || []).filter((item) => item.case_id === caseData.id));
      setError("");
    } catch (loadError) {
      setError(loadError.message || "Failed to load case workspace.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCaseWorkspace();
  }, [id]);

  const latestReport = caseItem?.reports?.[0] || null;
  const topInsights = reportSummaryBullets(latestReport || {});
  const anomalyList = (trends?.anomalies || []).slice(0, 4);
  const displayInsights = insights?.key_findings?.length ? insights.key_findings : topInsights;
  const previewSummary = (trends?.summary || []).slice(0, 3);
  const statusTone = getStatusTone(caseItem?.status, isDark);
  const patientMeta = [
    caseItem?.patient?.age ? `${caseItem.patient.age} years` : null,
    caseItem?.patient?.gender,
    caseItem?.patient?.blood_group,
  ]
    .filter(Boolean)
    .join(" | ");

  const handleRequestAccess = async () => {
    if (!caseItem?.id) return;

    setRequestingAccess(true);
    try {
      await requestDoctorReportAccess(caseItem.id);
      await loadCaseWorkspace();
    } catch (requestError) {
      setError(requestError.message || "Failed to request report access.");
    } finally {
      setRequestingAccess(false);
    }
  };

  const handleOpenReport = (report) => {
    setSelectedReport(report);
    setReportViewMode("ai");
    setOpenExportMenuId("");
  };

  const handleExportReport = async (reportId, mode) => {
    setExportingKey(`${reportId}:${mode}`);
    try {
      await ExportService.exportSingleReportPdf(reportId, mode);
      setOpenExportMenuId("");
    } catch (exportError) {
      setError(exportError.message || "Failed to export report PDF.");
    } finally {
      setExportingKey("");
    }
  };

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
        {error || "Case could not be loaded."}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <section
        className={`rounded-[2rem] border px-6 py-6 md:px-8 md:py-7 ${
          isDark
            ? "border-white/10 bg-[linear-gradient(135deg,rgba(37,46,79,0.82),rgba(20,27,49,0.82))]"
            : "border-slate-200 bg-[linear-gradient(135deg,rgba(255,255,255,0.97),rgba(241,245,249,0.92))]"
        }`}
      >
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="min-w-0 flex-1">
            <Link
              to="/doctor/cases"
              className={`inline-flex items-center gap-2 text-sm font-bold ${isDark ? "text-cyan-300" : "text-blue-700"}`}
            >
              <ChevronLeft size={16} />
              Back to cases
            </Link>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <h1 className={`text-4xl font-black tracking-tight ${isDark ? "text-white" : "text-slate-900"}`}>
                {caseItem.patient?.full_name || "Patient Case"}
              </h1>
              <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-black uppercase tracking-[0.18em] ${statusTone}`}>
                {formatStatusLabel(caseItem.status)}
              </span>
            </div>

            <p className={`mt-3 max-w-3xl text-base leading-7 ${isDark ? "text-slate-300" : "text-slate-600"}`}>
              {caseItem.title} for {caseItem.doctor?.user?.full_name || "the assigned doctor"}.
              {patientMeta ? ` Patient context: ${patientMeta}.` : ""}
            </p>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <SnapshotItem label="Patient ID" value={caseItem.patient?.patient_id || "Unknown"} subvalue="Medical identity" isDark={isDark} />
              <SnapshotItem
                label="Reports Available"
                value={String(caseItem.report_count || 0)}
                subvalue={caseItem.report_access_status === "granted" ? "Unlocked for review" : "Awaiting permission"}
                isDark={isDark}
              />
              <SnapshotItem
                label="Messages"
                value={String(caseItem.message_count || 0)}
                subvalue={appointments.length ? `${appointments.length} scheduled appointment${appointments.length > 1 ? "s" : ""}` : "No appointments yet"}
                isDark={isDark}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => navigate(`/doctor/case/${caseItem.id}/insights`)}
              className={`inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold ${isDark ? "bg-violet-500/10 text-violet-200 hover:bg-violet-500/15" : "bg-violet-50 text-violet-700 hover:bg-violet-100"}`}
            >
              <Brain size={16} />
              Insights
            </button>
            <button
              type="button"
              onClick={() => navigate(`/doctor/chats?case=${caseItem.id}`)}
              className={`inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold ${isDark ? "bg-cyan-500/10 text-cyan-200 hover:bg-cyan-500/15" : "bg-cyan-50 text-cyan-700 hover:bg-cyan-100"}`}
            >
              <MessageSquare size={16} />
              Open Chat
            </button>
            <button
              type="button"
              onClick={() => navigate(`/doctor/calendar?case=${caseItem.id}`)}
              className={`inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold ${isDark ? "bg-white/5 text-slate-100 hover:bg-white/10" : "bg-white text-slate-700 hover:bg-slate-100"}`}
            >
              <CalendarDays size={16} />
              Schedule Appointment
            </button>
          </div>
        </div>
      </section>

      {error ? (
        <div className={`rounded-2xl px-4 py-3 text-sm font-semibold ${isDark ? "bg-red-500/10 text-red-300" : "bg-red-50 text-red-700"}`}>
          {error}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-6">
          <SectionCard title="Case Snapshot" icon={ShieldCheck} isDark={isDark}>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <SnapshotItem label="Patient ID" value={caseItem.patient?.patient_id || "Unknown"} isDark={isDark} />
              <SnapshotItem label="Demographics" value={patientMeta || "Unavailable"} isDark={isDark} />
              <SnapshotItem label="Reports" value={String(caseItem.report_count || 0)} isDark={isDark} />
              <SnapshotItem label="Messages" value={String(caseItem.message_count || 0)} isDark={isDark} />
            </div>
            <div className={`mt-4 rounded-2xl px-4 py-3 text-sm leading-7 ${isDark ? "bg-white/5 text-slate-300" : "bg-white text-slate-700"}`}>
              {caseItem.description || "No case description was provided."}
            </div>
          </SectionCard>

          <SectionCard
            title="Insights Preview"
            icon={TrendingUp}
            isDark={isDark}
            action={(
              <button
                type="button"
                onClick={() => navigate(`/doctor/case/${caseItem.id}/insights`)}
                className={`rounded-xl px-4 py-2 text-sm font-bold ${isDark ? "bg-violet-500/10 text-violet-200 hover:bg-violet-500/15" : "bg-violet-50 text-violet-700 hover:bg-violet-100"}`}
              >
                Open Full Insights
              </button>
            )}
          >
            {insightsLoading ? (
              <div className="flex min-h-[16rem] items-center justify-center">
                <LoaderCircle size={24} className="animate-spin text-cyan-400" />
              </div>
            ) : (
              <div className="space-y-6">
                {insightsError ? (
                  <div className={`rounded-2xl px-4 py-3 text-sm font-semibold ${isDark ? "bg-red-500/10 text-red-300" : "bg-red-50 text-red-700"}`}>
                    {insightsError}
                  </div>
                ) : null}

                <div className="grid gap-4 xl:grid-cols-[0.92fr_1.08fr]">
                  <HealthSummary trends={trends} insights={insights} isDark={isDark} />
                  <div className={`rounded-[1.6rem] border p-5 ${isDark ? "border-white/10 bg-white/[0.03]" : "border-slate-200 bg-white"}`}>
                    <div className={`text-xs font-black uppercase tracking-[0.2em] ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                      Trend Snapshot
                    </div>
                    <div className="mt-3 space-y-3">
                      {previewSummary.length ? previewSummary.map((item, index) => (
                        <div
                          key={`${item}-${index}`}
                          className={`rounded-2xl px-4 py-3 text-sm leading-7 ${isDark ? "bg-white/5 text-slate-200" : "bg-slate-50 text-slate-700"}`}
                        >
                          {item}
                        </div>
                      )) : (
                        <div className={`rounded-2xl px-4 py-3 text-sm ${isDark ? "bg-white/5 text-slate-400" : "bg-slate-100 text-slate-500"}`}>
                          No trend snapshot is available yet.
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <InsightSummary
                  insights={{
                    ...insights,
                    key_findings: (insights?.key_findings || []).slice(0, 3),
                    summary: (insights?.summary || []).slice(0, 2),
                  }}
                  trends={{
                    ...trends,
                    summary: previewSummary,
                  }}
                  isDark={isDark}
                />
              </div>
            )}
          </SectionCard>

          <SectionCard title="Linked Reports" icon={FileSearch} isDark={isDark}>
            {caseItem.report_access_status === "granted" ? (
              <div className="space-y-4">
                {(caseItem.reports || []).length ? (
                  caseItem.reports.map((report) => (
                    <LinkedReportCard key={report.id} report={report} isDark={isDark} onOpen={handleOpenReport} />
                  ))
                ) : (
                  <div className={`rounded-2xl border border-dashed px-4 py-8 text-center ${isDark ? "border-white/10 text-slate-500" : "border-slate-200 text-slate-400"}`}>
                    No uploaded reports are available for this patient yet.
                  </div>
                )}
              </div>
            ) : (
              <div className={`rounded-2xl px-4 py-4 text-sm leading-7 ${isDark ? "bg-white/5 text-slate-300" : "bg-slate-50 text-slate-700"}`}>
                Linked reports will become available here once the patient grants report access. After that, each report opens in a focused overlay with AI summary, the original uploaded report, and PDF export options.
              </div>
            )}
          </SectionCard>
        </div>

        <div className="space-y-6">
          <SectionCard
            title="Report Access"
            icon={ShieldCheck}
            isDark={isDark}
            action={(
              <button
                type="button"
                onClick={handleRequestAccess}
                disabled={requestingAccess || caseItem.report_access_status === "requested"}
                className={`rounded-xl px-4 py-2 text-sm font-bold ${isDark ? "bg-white/5 text-slate-100 hover:bg-white/10" : "bg-white text-slate-700 hover:bg-slate-100"} disabled:opacity-60`}
              >
                {caseItem.report_access_status === "denied" ? "Request Again" : "Request Access"}
              </button>
            )}
          >
            <div
              className={`rounded-2xl px-4 py-4 text-sm leading-7 ${
                caseItem.report_access_status === "granted"
                  ? isDark ? "bg-emerald-500/10 text-emerald-200" : "bg-emerald-50 text-emerald-700"
                  : caseItem.report_access_status === "requested"
                    ? isDark ? "bg-amber-500/10 text-amber-200" : "bg-amber-50 text-amber-700"
                    : caseItem.report_access_status === "denied"
                      ? isDark ? "bg-red-500/10 text-red-200" : "bg-red-50 text-red-700"
                      : isDark ? "bg-white/5 text-slate-300" : "bg-white text-slate-700"
              }`}
            >
              {caseItem.report_access_status === "granted"
                ? "Patient granted access. Linked reports can now be reviewed and exported."
                : caseItem.report_access_status === "requested"
                  ? "Waiting for patient confirmation in chat."
                  : caseItem.report_access_status === "denied"
                    ? "Patient denied access. The consultation is paused until another request is sent."
                    : "No report access request has been sent yet."}
            </div>
          </SectionCard>

          <SectionCard title="Clinical Alerts" icon={AlertTriangle} isDark={isDark}>
            <div className="space-y-3">
              {anomalyList.length ? anomalyList.map((anomaly, index) => (
                <div
                  key={`${anomaly.parameter}-${index}`}
                  className={`rounded-2xl border px-4 py-3 text-sm leading-7 ${
                    anomaly.severity === "critical"
                      ? isDark ? "border-red-400/15 bg-red-500/10 text-red-200" : "border-red-200 bg-red-50 text-red-700"
                      : isDark ? "border-amber-400/15 bg-amber-500/10 text-amber-200" : "border-amber-200 bg-amber-50 text-amber-700"
                  }`}
                >
                  {anomaly.message}
                </div>
              )) : (
                <div className={`rounded-2xl px-4 py-3 text-sm ${isDark ? "bg-white/5 text-slate-400" : "bg-white text-slate-500"}`}>
                  No anomaly alerts are available yet.
                </div>
              )}
            </div>
          </SectionCard>

          <SectionCard title="AI Highlights" icon={TrendingUp} isDark={isDark}>
            <div className="space-y-3">
              {displayInsights.length ? displayInsights.map((insight, index) => (
                <div key={`${insight}-${index}`} className={`rounded-2xl px-4 py-3 text-sm leading-7 ${isDark ? "bg-white/5 text-slate-200" : "bg-white text-slate-700"}`}>
                  {insight}
                </div>
              )) : (
                <div className={`rounded-2xl px-4 py-3 text-sm ${isDark ? "bg-white/5 text-slate-400" : "bg-white text-slate-500"}`}>
                  No abnormal AI findings are available for this case yet.
                </div>
              )}
            </div>
          </SectionCard>

          <SectionCard title="Appointments" icon={CalendarDays} isDark={isDark}>
            <div className="space-y-3">
              {appointments.length ? appointments.map((appointment) => (
                <div key={appointment.id} className={`rounded-2xl px-4 py-4 ${isDark ? "bg-white/5" : "bg-white"}`}>
                  <div className="font-bold">{appointment.title}</div>
                  <div className={`mt-1 flex items-center gap-2 text-sm ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                    <Clock3 size={14} />
                    {formatDateTime(appointment.date_time)}
                  </div>
                  <div className={`mt-1 text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                    {appointment.location || "Location to be confirmed"}
                  </div>
                </div>
              )) : (
                <div className={`rounded-2xl px-4 py-3 text-sm ${isDark ? "bg-white/5 text-slate-400" : "bg-white text-slate-500"}`}>
                  No appointment has been booked for this case yet.
                </div>
              )}
            </div>
          </SectionCard>
        </div>
      </div>

      <ReportOverlay
        report={selectedReport}
        isDark={isDark}
        viewMode={reportViewMode}
        onViewChange={setReportViewMode}
        exportMenuOpen={openExportMenuId === selectedReport?.id}
        onToggleExportMenu={setOpenExportMenuId}
        onExport={handleExportReport}
        exportingKey={exportingKey}
        onClose={() => {
          setSelectedReport(null);
          setOpenExportMenuId("");
          setReportViewMode("ai");
        }}
      />
    </div>
  );
}

import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Download,
  LoaderCircle,
  Microscope,
  TrendingUp,
} from "lucide-react";
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
import { authService } from "../../services/auth.service";
import caseService from "../../services/case.service";
import reportService from "../../services/report.service";
import HealthCore from "../../components/patient/HealthCore";
import HealthSignals from "../../components/patient/HealthSignals";
import ProfilePanel from "../../components/patient/ProfilePanel";
import {
  buildAlertItems,
  calculateHealthScore,
  formatParameterLabel,
  getLatestParameter,
  getLatestReport,
  getRecentReports,
  getReportPreviewInsight,
} from "../../utils/patientIntelligence";
import ExportService from "../../services/ExportService";

function formatDate(value) {
  if (!value) return "Date pending";
  return new Date(value).toLocaleDateString();
}

function formatShortDate(value) {
  if (!value) return "";
  return new Date(value).toLocaleDateString(undefined, { month: "short", year: "2-digit" });
}

function DashboardCard({ title, subtitle, children, isDark }) {
  return (
    <section
      className={`rounded-2xl border p-6 ${
        isDark ? "bg-slate-950 border-white/10" : "bg-white border-slate-100 shadow-lg shadow-slate-100/50"
      }`}
    >
      <div className="mb-5">
        <h2 className={`text-xl font-black ${isDark ? "text-white" : "text-slate-900"}`}>{title}</h2>
        {subtitle ? (
          <p className={`mt-1 text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>{subtitle}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function MiniTrendTooltip({ active, payload, label, isDark }) {
  if (!active || !payload?.length) return null;
  return (
    <div className={`rounded-2xl border px-4 py-3 text-sm ${isDark ? "bg-slate-950 border-white/10 text-slate-200" : "bg-white border-slate-200 text-slate-700 shadow-lg"}`}>
      <div className="font-bold mb-2">{formatDate(label)}</div>
      {payload.map((item) => (
        <div key={item.dataKey} className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
          <span>{item.name}: {item.value ?? "-"}</span>
        </div>
      ))}
    </div>
  );
}

export default function PatientDashboard() {
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [reports, setReports] = useState([]);
  const [trends, setTrends] = useState(null);
  const [insights, setInsights] = useState(null);
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exportError, setExportError] = useState("");

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const [profileData, reportData, trendData, insightData, caseData] = await Promise.all([
          authService.getPatientProfile(),
          reportService.getReports(),
          reportService.getTrends(),
          reportService.getInsights(),
          caseService.getCases(),
        ]);

        setProfile(profileData);
        setReports(reportData || []);
        setTrends(trendData);
        setInsights(insightData);
        setCases(caseData || []);
      } catch (error) {
        console.error("Failed to load patient dashboard:", error);
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, []);

  const latestReport = useMemo(() => getLatestReport(reports), [reports]);
  const recentReports = useMemo(() => getRecentReports(reports, 3), [reports]);
  const healthScore = useMemo(() => calculateHealthScore(reports, trends, insights), [reports, trends, insights]);
  const alerts = useMemo(() => buildAlertItems(reports, trends, insights), [reports, trends, insights]);
  const anomalies = (trends?.anomalies || []).slice(0, 6);
  const activeCase = useMemo(
    () => cases.find((item) => item.status === "pending" || item.status === "open" || item.status === "in_review") || null,
    [cases]
  );

  const quickStats = useMemo(
    () =>
      [
        getLatestParameter(reports, "hemoglobin"),
        getLatestParameter(reports, "platelets"),
        getLatestParameter(reports, "vitamin_b12"),
      ].filter(Boolean),
    [reports]
  );

  const trendSummary = (trends?.summary || []).slice(0, 3);
  const keyFindings = (insights?.key_findings || []).slice(0, 3);
  const healthSummaryItems = [...trendSummary, ...keyFindings].slice(0, 5);
  const isNewUser = reports.length === 0;

  const miniTrendData = useMemo(
    () =>
      (trends?.table || []).slice(-6).map((row) => ({
        date: row.date,
        hemoglobin: row.hemoglobin ?? null,
        platelets: row.platelets ? row.platelets / 1000 : null,
      })),
    [trends]
  );

  const abnormalParameterCount = useMemo(
    () =>
      reports.reduce(
        (count, report) =>
          count +
          (report.parameters || []).filter((parameter) =>
            ["low", "high", "deficient", "insufficient"].includes(
              String(parameter.status || parameter.interpretation || "").toLowerCase()
            )
          ).length,
        0
      ),
    [reports]
  );

  const categoryCount = useMemo(
    () => new Set(reports.map((report) => report.report_category).filter(Boolean)).size,
    [reports]
  );

  const activeConditionCount = alerts.length;

  const handleExport = () => {
    try {
      setExportError("");
      ExportService.exportAiHealthSummary({ profile, reports, trends, insights });
    } catch (error) {
      setExportError(error.message || "Unable to open export window.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <LoaderCircle size={28} className="animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 px-4 md:px-0">
      <section className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 className={`text-4xl md:text-5xl font-black tracking-tight ${isDark ? "text-white" : "text-slate-900"}`}>
            Your Health. Understood Over Time.
          </h1>
          <p className={`mt-2 text-lg ${isDark ? "text-slate-400" : "text-slate-500"}`}>
            {isNewUser ? "Upload your first report to activate your clinical timeline." : "A cleaner view of the patterns, signals, and changes shaping your health story."}
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleExport}
            className={`inline-flex items-center gap-2 rounded-2xl px-4 py-3 font-bold transition-colors ${
              isDark ? "bg-white/5 text-slate-200 hover:bg-white/10" : "bg-white text-slate-700 hover:bg-slate-100 shadow-sm"
            }`}
          >
            <Download size={16} />
            Export AI Health Summary
          </button>
          <div className={`rounded-2xl px-5 py-4 ${isDark ? "bg-white/5 text-slate-200" : "bg-white text-slate-700 shadow-sm"}`}>
            <div className="text-xs font-black uppercase tracking-[0.25em] opacity-60">Reports</div>
            <div className="text-3xl font-black mt-1">{reports.length}</div>
          </div>
        </div>
      </section>

      {isNewUser ? (
        <DashboardCard isDark={isDark} title="Start Your Medical Timeline" subtitle="Upload a report to generate extraction, trends, and structured history.">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="rounded-2xl bg-blue-500/10 text-blue-500 p-4">
                <Microscope size={28} />
              </div>
              <p className={`${isDark ? "text-slate-300" : "text-slate-700"} font-semibold max-w-2xl`}>
                Upload your first report and the system will extract medical values, generate timeline context, and begin tracking trends automatically.
              </p>
            </div>

            <button
              type="button"
              onClick={() => navigate("/patient/reports")}
              className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 font-bold text-white hover:bg-blue-500 transition-colors"
            >
              Upload First Report
              <ArrowRight size={16} />
            </button>
          </div>
        </DashboardCard>
      ) : null}

      {exportError ? (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-500">
          {exportError}
        </div>
      ) : null}

      <div className="grid grid-cols-1 xl:grid-cols-[1.6fr_1fr] gap-6">
        <HealthCore
          score={healthScore.score}
          status={healthScore.status}
          explanation={healthScore.explanation}
          reasons={healthScore.reasons}
          isDark={isDark}
        />
        <HealthSignals alerts={alerts} anomalies={anomalies} isDark={isDark} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.15fr_0.85fr] gap-6">
        <DashboardCard
          isDark={isDark}
          title="Health Summary"
          subtitle={latestReport ? `${formatDate(latestReport.report_date || latestReport.created_at)}${latestReport.lab_name ? ` • ${latestReport.lab_name}` : ""}` : "No report summary yet"}
        >
          <div className="space-y-4">
            <div className={`rounded-2xl p-4 ${isDark ? "bg-white/5" : "bg-slate-50"}`}>
              <div className={`text-xs font-black uppercase tracking-[0.24em] ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                Latest Interpretation
              </div>
              <div className={`mt-3 text-lg leading-7 ${isDark ? "text-slate-200" : "text-slate-700"}`}>
                {latestReport?.summary || insights?.summary?.[0] || "A fuller summary will appear once more reports are processed."}
              </div>
            </div>

            <div className="space-y-3">
              {healthSummaryItems.length ? (
                healthSummaryItems.map((item) => (
                  <div key={item} className={`rounded-2xl p-4 ${isDark ? "bg-cyan-500/10 text-slate-200" : "bg-blue-50 text-slate-700"}`}>
                    {item}
                  </div>
                ))
              ) : (
                <div className={`rounded-2xl p-4 text-sm ${isDark ? "bg-white/5 text-slate-400" : "bg-slate-50 text-slate-500"}`}>
                  Summary insights will appear as more structured reports are processed.
                </div>
              )}
            </div>
          </div>
        </DashboardCard>

        <ProfilePanel profile={profile} reports={reports} trends={trends} isDark={isDark} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[0.95fr_1.05fr] gap-6">
        <DashboardCard isDark={isDark} title="Quick Stats" subtitle="Latest key markers from your newest structured report">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {quickStats.length ? (
              quickStats.map((stat) => (
                <Link
                  key={stat.name}
                  to={`/patient/parameter/${stat.name}`}
                  className={`rounded-2xl p-4 transition-colors ${isDark ? "bg-white/5 hover:bg-white/10" : "bg-slate-50 hover:bg-slate-100"}`}
                >
                  <div className={`text-xs font-black uppercase tracking-[0.22em] ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                    {formatParameterLabel(stat.name)}
                  </div>
                  <div className={`mt-2 text-3xl font-black ${isDark ? "text-white" : "text-slate-900"}`}>
                    {stat.value}
                  </div>
                  <div className={`mt-1 text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                    {stat.unit || "-"} • {stat.status || stat.interpretation || "unknown"}
                  </div>
                </Link>
              ))
            ) : (
              <div className={`${isDark ? "text-slate-500" : "text-slate-400"} text-sm`}>
                Quick stats will appear after the first structured report is processed.
              </div>
            )}
          </div>
        </DashboardCard>

        <DashboardCard isDark={isDark} title="Mini Trends" subtitle="A clean read on recent hemoglobin and platelet movement">
          {miniTrendData.length ? (
            <div className="space-y-4">
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={miniTrendData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "rgba(148,163,184,0.12)" : "rgba(148,163,184,0.18)"} vertical={false} />
                    <XAxis
                      dataKey="date"
                      tickFormatter={formatShortDate}
                      stroke={isDark ? "#94a3b8" : "#64748b"}
                      tickLine={false}
                      axisLine={false}
                      fontSize={12}
                    />
                    <YAxis
                      yAxisId="hemoglobin"
                      orientation="left"
                      stroke={isDark ? "#60a5fa" : "#3b82f6"}
                      tickLine={false}
                      axisLine={false}
                      fontSize={12}
                    />
                    <YAxis
                      yAxisId="platelets"
                      orientation="right"
                      stroke={isDark ? "#2dd4bf" : "#0f766e"}
                      tickLine={false}
                      axisLine={false}
                      fontSize={12}
                    />
                    <Tooltip content={<MiniTrendTooltip isDark={isDark} />} />
                    <Line yAxisId="hemoglobin" type="monotone" dataKey="hemoglobin" name="Hemoglobin" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} connectNulls />
                    <Line yAxisId="platelets" type="monotone" dataKey="platelets" name="Platelets (x10^3/uL)" stroke="#14b8a6" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} connectNulls />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <Link
                to="/patient/trends"
                className={`inline-flex items-center gap-2 rounded-2xl px-4 py-3 font-bold transition-colors ${
                  isDark ? "bg-white/5 text-slate-200 hover:bg-white/10" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                <TrendingUp size={16} />
                Open Full Trends
              </Link>
            </div>
          ) : (
            <div className={`${isDark ? "text-slate-500" : "text-slate-400"} text-sm`}>
              Mini-trends appear once enough processed reports are available.
            </div>
          )}
        </DashboardCard>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_1fr] gap-6">
        <DashboardCard isDark={isDark} title="Timeline Preview" subtitle="Your three most recent reports, each with a quick clinical takeaway">
          <div className="space-y-3">
            {recentReports.length ? (
              recentReports.map((report) => (
                <Link
                  key={report.id}
                  to="/patient/timeline"
                  className={`block rounded-2xl p-4 transition-colors ${isDark ? "bg-white/5 hover:bg-white/10" : "bg-slate-50 hover:bg-slate-100"}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className={`text-xs font-black uppercase tracking-[0.22em] ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                        {report.report_type || "Medical Report"}
                      </div>
                      <div className={`mt-2 font-bold ${isDark ? "text-white" : "text-slate-900"}`}>
                        {formatDate(report.report_date || report.created_at)}
                      </div>
                      <div className={`mt-1 text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                        {report.lab_name || "Unknown lab"}
                      </div>
                    </div>
                  </div>

                  <div className={`mt-4 text-sm leading-6 ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                    {getReportPreviewInsight(report)}
                  </div>
                </Link>
              ))
            ) : (
              <div className={`rounded-2xl p-4 text-sm ${isDark ? "bg-white/5 text-slate-400" : "bg-slate-50 text-slate-500"}`}>
                Timeline entries will appear as soon as reports are uploaded.
              </div>
            )}
          </div>
        </DashboardCard>

        <DashboardCard isDark={isDark} title="System Stats" subtitle="A clean overview of your current report intelligence footprint">
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Reports", value: reports.length },
              { label: "Categories", value: categoryCount || 0 },
              { label: "Abnormal", value: abnormalParameterCount },
              { label: "Conditions", value: activeConditionCount },
            ].map((item) => (
              <div key={item.label} className={`rounded-2xl p-4 ${isDark ? "bg-white/5" : "bg-slate-50"}`}>
                <div className={`text-xs font-black uppercase tracking-[0.22em] ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                  {item.label}
                </div>
                <div className={`mt-2 text-3xl font-black ${isDark ? "text-white" : "text-slate-900"}`}>
                  {item.value}
                </div>
              </div>
            ))}
          </div>

          <div className={`mt-5 rounded-2xl p-4 ${isDark ? "bg-white/5" : "bg-slate-50"}`}>
            <div className={`text-xs font-black uppercase tracking-[0.24em] ${isDark ? "text-slate-500" : "text-slate-400"}`}>
              Consultation Status
            </div>
            <div className={`mt-2 text-lg font-bold ${isDark ? "text-white" : "text-slate-900"}`}>
              {activeCase ? activeCase.status.replaceAll("_", " ") : "No active case"}
            </div>
            <div className={`mt-1 text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>
              {activeCase ? activeCase.title : "Request a consultation when you want doctor-led review."}
            </div>
          </div>
        </DashboardCard>
      </div>
    </div>
  );
}

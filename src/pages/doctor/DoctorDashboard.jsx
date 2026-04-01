import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  FileHeart,
  LoaderCircle,
  RefreshCcw,
  ShieldAlert,
  Stethoscope,
  TrendingUp,
  XCircle,
} from "lucide-react";
import { useTheme } from "../../context/ThemeContext";
import appointmentService from "../../services/appointment.service";
import {
  acceptDoctorCase,
  getDoctorCase,
  getDoctorCases,
  getDoctorDashboard,
  getDoctorProfile,
  getPatientTrendOverview,
  rejectDoctorCase,
} from "../../services/doctor.service";

function MetricCard({ icon: Icon, label, value, tone, isDark }) {
  const tones = {
    cyan: isDark ? "from-cyan-500/20 to-blue-500/10 text-cyan-200" : "from-cyan-50 to-blue-50 text-blue-700",
    emerald: isDark ? "from-emerald-500/20 to-teal-500/10 text-emerald-200" : "from-emerald-50 to-teal-50 text-emerald-700",
    amber: isDark ? "from-amber-500/20 to-orange-500/10 text-amber-200" : "from-amber-50 to-orange-50 text-amber-700",
    violet: isDark ? "from-violet-500/20 to-fuchsia-500/10 text-violet-200" : "from-violet-50 to-fuchsia-50 text-violet-700",
  };

  return (
    <div className={`rounded-[1.75rem] border bg-gradient-to-br p-5 ${tones[tone]} ${isDark ? "border-white/10" : "border-slate-200"}`}>
      <div className="flex items-center justify-between">
        <div className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl ${isDark ? "bg-white/10" : "bg-white/70"}`}>
          <Icon size={18} />
        </div>
        <div className="text-3xl font-black tracking-tight">{value}</div>
      </div>
      <div className={`mt-4 text-xs font-black uppercase tracking-[0.18em] ${isDark ? "text-slate-300" : "text-slate-500"}`}>{label}</div>
    </div>
  );
}

function TrendBadge({ metric, isDark }) {
  if (!metric) return null;
  return (
    <div className={`rounded-xl px-3 py-2 text-sm ${isDark ? "bg-white/5 text-slate-200" : "bg-slate-100 text-slate-700"}`}>
      <div className="font-bold">{metric.label}</div>
      <div className={`mt-1 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
        {metric.direction} {metric.change ? `• ${metric.change}` : ""} {metric.stability ? `• ${metric.stability}` : ""}
      </div>
    </div>
  );
}

function OverviewModal({
  caseItem,
  trendOverview,
  loading,
  isDark,
  onClose,
  onAccept,
  onReject,
  actingId,
}) {
  if (!caseItem && !loading) return null;

  const topMetrics = trendOverview?.metrics
    ? Object.entries(trendOverview.metrics)
        .slice(0, 4)
        .map(([name, metric]) => ({
          key: name,
          label: name.replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase()),
          ...metric,
        }))
    : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
      <div className={`max-h-[88vh] w-full max-w-5xl overflow-y-auto rounded-[2rem] border p-6 md:p-8 ${isDark ? "border-white/10 bg-slate-950 text-white" : "border-slate-200 bg-white text-slate-900"}`}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className={`text-[11px] font-black uppercase tracking-[0.22em] ${isDark ? "text-cyan-300/75" : "text-blue-700/75"}`}>Patient Overview</div>
            <h3 className="mt-2 text-3xl font-black tracking-tight">{caseItem?.patient?.full_name || "Loading patient..."}</h3>
            <p className={`mt-2 text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>
              Review the patient profile, whole-record trends, anomalies, and recent reports before deciding whether to accept the consultation request.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`rounded-2xl px-4 py-2 text-sm font-bold ${isDark ? "bg-white/5 text-slate-200 hover:bg-white/10" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}
          >
            Close
          </button>
        </div>

        {loading ? (
          <div className="flex min-h-[18rem] items-center justify-center">
            <LoaderCircle size={28} className="animate-spin text-cyan-400" />
          </div>
        ) : caseItem ? (
          <div className="mt-6 space-y-6">
            <section className={`grid gap-4 rounded-[1.75rem] border p-5 md:grid-cols-4 ${isDark ? "border-white/10 bg-white/[0.03]" : "border-slate-200 bg-slate-50"}`}>
              <div>
                <div className={`text-xs font-black uppercase tracking-[0.18em] ${isDark ? "text-slate-500" : "text-slate-400"}`}>Patient</div>
                <div className="mt-2 font-bold">{caseItem.patient?.full_name || "Unknown"}</div>
              </div>
              <div>
                <div className={`text-xs font-black uppercase tracking-[0.18em] ${isDark ? "text-slate-500" : "text-slate-400"}`}>Demographics</div>
                <div className="mt-2 font-bold">
                  {[caseItem.patient?.age ? `${caseItem.patient.age}y` : null, caseItem.patient?.gender, caseItem.patient?.blood_group].filter(Boolean).join(" • ") || "Not available"}
                </div>
              </div>
              <div>
                <div className={`text-xs font-black uppercase tracking-[0.18em] ${isDark ? "text-slate-500" : "text-slate-400"}`}>Reports</div>
                <div className="mt-2 font-bold">{caseItem.report_count || 0}</div>
              </div>
              <div>
                <div className={`text-xs font-black uppercase tracking-[0.18em] ${isDark ? "text-slate-500" : "text-slate-400"}`}>Trend Confidence</div>
                <div className="mt-2 text-sm font-semibold">
                  Based on {trendOverview?.reports?.length || 0} report{(trendOverview?.reports?.length || 0) === 1 ? "" : "s"}
                </div>
              </div>
            </section>

            <section className="grid gap-4 lg:grid-cols-[1fr,1fr]">
              <div className={`rounded-[1.75rem] border p-5 ${isDark ? "border-white/10 bg-white/[0.03]" : "border-slate-200 bg-slate-50"}`}>
                <div className="flex items-center gap-2 text-lg font-black">
                  <TrendingUp size={18} />
                  Patient Trend Summary
                </div>
                <div className="mt-4 space-y-3">
                  {(trendOverview?.summary?.length ? trendOverview.summary : ["No patient-wide trend summary available yet."]).slice(0, 5).map((item, index) => (
                    <div key={`${item}-${index}`} className={`rounded-2xl px-4 py-3 text-sm ${isDark ? "bg-white/5 text-slate-200" : "bg-white text-slate-700"}`}>
                      {item}
                    </div>
                  ))}
                </div>
              </div>

              <div className={`rounded-[1.75rem] border p-5 ${isDark ? "border-white/10 bg-white/[0.03]" : "border-slate-200 bg-slate-50"}`}>
                <div className="flex items-center gap-2 text-lg font-black">
                  <AlertTriangle size={18} />
                  Patient Anomalies
                </div>
                <div className="mt-4 space-y-3">
                  {(trendOverview?.anomalies?.length ? trendOverview.anomalies : []).slice(0, 5).map((anomaly, index) => (
                    <div
                      key={`${anomaly.parameter}-${index}`}
                      className={`rounded-2xl px-4 py-3 text-sm ${
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
                  ))}
                  {!trendOverview?.anomalies?.length ? (
                    <div className={`rounded-2xl px-4 py-3 text-sm ${isDark ? "bg-white/5 text-slate-400" : "bg-white text-slate-500"}`}>
                      No cross-report anomalies detected so far.
                    </div>
                  ) : null}
                </div>
              </div>
            </section>

            <section className={`rounded-[1.75rem] border p-5 ${isDark ? "border-white/10 bg-white/[0.03]" : "border-slate-200 bg-slate-50"}`}>
              <div className="text-lg font-black">General Trend Metrics</div>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {topMetrics.length ? (
                  topMetrics.map((metric) => (
                    <TrendBadge key={metric.key} metric={metric} isDark={isDark} />
                  ))
                ) : (
                  <div className={`text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>Trend metrics will appear after enough patient reports are available.</div>
                )}
              </div>
            </section>

            <section className="grid gap-4 lg:grid-cols-[1.2fr,0.8fr]">
              <div className={`rounded-[1.75rem] border p-5 ${isDark ? "border-white/10 bg-white/[0.03]" : "border-slate-200 bg-slate-50"}`}>
                <div className="text-lg font-black">Latest Clinical Signals</div>
                <div className="mt-4 space-y-3">
                  {(caseItem.reports?.[0]?.insights?.length ? caseItem.reports[0].insights : ["No abnormal AI insights available yet."]).map((insight, index) => (
                    <div key={`${insight}-${index}`} className={`rounded-2xl px-4 py-3 text-sm ${isDark ? "bg-white/5 text-slate-200" : "bg-white text-slate-700"}`}>
                      {insight}
                    </div>
                  ))}
                </div>
              </div>

              <div className={`rounded-[1.75rem] border p-5 ${isDark ? "border-white/10 bg-white/[0.03]" : "border-slate-200 bg-slate-50"}`}>
                <div className="text-lg font-black">Request Context</div>
                <div className={`mt-4 space-y-3 text-sm ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                  <div>{caseItem.description || "No request note available."}</div>
                  <div>Patient ID: <span className="font-bold">{caseItem.patient?.patient_id || "Unavailable"}</span></div>
                  <div>Phone: <span className="font-bold">{caseItem.patient?.phone_number || "Unavailable"}</span></div>
                  <div>Status: <span className="font-bold capitalize">{caseItem.status}</span></div>
                </div>
              </div>
            </section>

            <section className={`rounded-[1.75rem] border p-5 ${isDark ? "border-white/10 bg-white/[0.03]" : "border-slate-200 bg-slate-50"}`}>
              <div className="text-lg font-black">Recent Reports</div>
              <div className="mt-4 space-y-3">
                {(caseItem.reports || []).slice(0, 3).map((report) => (
                  <div key={report.id} className={`rounded-2xl px-4 py-4 ${isDark ? "bg-white/5" : "bg-white"}`}>
                    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                      <div>
                        <div className="font-bold">{report.report_type || "Clinical Report"}</div>
                        <div className={`text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                          {[report.report_date, report.lab_name].filter(Boolean).join(" • ") || "Date and lab details pending"}
                        </div>
                      </div>
                      <div className={`rounded-full px-3 py-1 text-xs font-black uppercase tracking-[0.16em] ${isDark ? "bg-cyan-500/10 text-cyan-300" : "bg-cyan-50 text-cyan-700"}`}>
                        {report.report_category || "general"}
                      </div>
                    </div>
                    {report.insights?.length ? (
                      <div className={`mt-3 text-sm ${isDark ? "text-slate-300" : "text-slate-600"}`}>{report.insights[0]}</div>
                    ) : null}
                  </div>
                ))}
                {!caseItem.reports?.length ? (
                  <div className={`rounded-2xl border border-dashed px-4 py-8 text-center ${isDark ? "border-white/10 text-slate-500" : "border-slate-200 text-slate-400"}`}>
                    No reports are linked to this case yet.
                  </div>
                ) : null}
              </div>
            </section>

            {caseItem.status === "pending" ? (
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => onAccept(caseItem.id)}
                  disabled={actingId === caseItem.id}
                  className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 font-bold text-white transition-colors hover:bg-emerald-500 disabled:opacity-60"
                >
                  <CheckCircle2 size={16} />
                  {actingId === caseItem.id ? "Processing..." : "Accept Request"}
                </button>
                <button
                  type="button"
                  onClick={() => onReject(caseItem.id)}
                  disabled={actingId === caseItem.id}
                  className={`inline-flex items-center gap-2 rounded-2xl px-5 py-3 font-bold ${isDark ? "bg-red-500/10 text-red-300 hover:bg-red-500/15" : "bg-red-50 text-red-700 hover:bg-red-100"}`}
                >
                  <XCircle size={16} />
                  Reject Request
                </button>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function DoctorDashboard() {
  const { isDark } = useTheme();
  const [profile, setProfile] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [cases, setCases] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [overviewCase, setOverviewCase] = useState(null);
  const [overviewTrends, setOverviewTrends] = useState(null);
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [actingId, setActingId] = useState("");

  const activeCases = useMemo(
    () => cases.filter((item) => item.status !== "closed" && item.status !== "transferred"),
    [cases]
  );

  const pendingCases = useMemo(
    () => activeCases.filter((item) => item.status === "pending"),
    [activeCases]
  );

  const nextActionItems = useMemo(
    () =>
      pendingCases.slice(0, 3).map((item) => ({
        id: item.id,
        patientName: item.patient?.full_name || item.patient_name || "Patient",
        reason: item.reports?.[0]?.insights?.[0] || item.description || "Consultation request awaiting review",
      })),
    [pendingCases]
  );

  const upcomingAppointments = useMemo(
    () =>
      appointments
        .filter((item) => item.status === "scheduled")
        .filter((item) => new Date(item.date_time) >= new Date())
        .sort((a, b) => new Date(a.date_time) - new Date(b.date_time))
        .slice(0, 3),
    [appointments]
  );

  const loadDashboard = async () => {
    try {
      const [profileData, dashboardData, caseData, appointmentData] = await Promise.all([
        getDoctorProfile(),
        getDoctorDashboard(),
        getDoctorCases(),
        appointmentService.getDoctorAppointments(),
      ]);
      setProfile(profileData);
      setDashboard(dashboardData);
      setCases(caseData || []);
      setAppointments(appointmentData || []);
      setError("");
    } catch (loadError) {
      setError(loadError.message || "Failed to load doctor dashboard.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const handleOverview = async (caseId) => {
    setOverviewLoading(true);
    setOverviewCase(null);
    setOverviewTrends(null);
    try {
      const data = await getDoctorCase(caseId);
      setOverviewCase(data);
      if (data?.patient?.id) {
        const trends = await getPatientTrendOverview(data.patient.id);
        setOverviewTrends(trends);
      }
    } catch (overviewError) {
      setError(overviewError.message || "Failed to load case overview.");
    } finally {
      setOverviewLoading(false);
    }
  };

  const handleAccept = async (caseId) => {
    setActingId(caseId);
    try {
      await acceptDoctorCase(caseId);
      await loadDashboard();
      if (overviewCase?.id === caseId) {
        await handleOverview(caseId);
      }
    } catch (actionError) {
      setError(actionError.message || "Failed to accept case.");
    } finally {
      setActingId("");
    }
  };

  const handleReject = async (caseId) => {
    setActingId(caseId);
    try {
      await rejectDoctorCase(caseId);
      setOverviewCase(null);
      setOverviewTrends(null);
      await loadDashboard();
    } catch (actionError) {
      setError(actionError.message || "Failed to reject case.");
    } finally {
      setActingId("");
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className={`inline-flex items-center gap-3 rounded-full border px-5 py-3 text-sm font-semibold ${isDark ? "border-white/10 bg-white/[0.05] text-slate-200" : "border-slate-200 bg-white text-slate-700 shadow-sm"}`}>
          <LoaderCircle size={16} className="animate-spin text-cyan-400" />
          Loading doctor dashboard...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className={`text-[11px] font-black uppercase tracking-[0.24em] ${isDark ? "text-cyan-200/75" : "text-blue-700/75"}`}>
            Dashboard
          </div>
          <h2 className="mt-2 text-3xl font-bold tracking-tight">
            Welcome, {profile?.user?.full_name || "Doctor"}
          </h2>
          <p className={`mt-3 max-w-3xl text-sm leading-7 ${isDark ? "text-slate-300" : "text-slate-600"}`}>
            Review incoming consultation requests, scan patient-wide risk signals, and accept only the cases that match your expertise and current availability.
          </p>
        </div>
        <button
          type="button"
          onClick={loadDashboard}
          className={`inline-flex items-center gap-2 rounded-2xl px-4 py-3 font-bold ${isDark ? "bg-white/5 text-slate-200 hover:bg-white/10" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}
        >
          <RefreshCcw size={16} />
          Refresh
        </button>
      </section>

      {error ? (
        <div className={`rounded-2xl px-4 py-3 text-sm font-semibold ${isDark ? "bg-red-500/10 text-red-300" : "bg-red-50 text-red-700"}`}>
          {error}
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={Stethoscope} label="Total Cases" value={dashboard?.total_cases ?? "--"} tone="cyan" isDark={isDark} />
        <MetricCard icon={ShieldAlert} label="Pending Review" value={pendingCases.length ?? "--"} tone="amber" isDark={isDark} />
        <MetricCard icon={CheckCircle2} label="Open Cases" value={activeCases.filter((item) => item.status === "open").length ?? "--"} tone="emerald" isDark={isDark} />
        <MetricCard icon={FileHeart} label="Linked Reports" value={dashboard?.recent_report_count ?? "--"} tone="violet" isDark={isDark} />
      </section>

      <section className="grid gap-5 xl:grid-cols-[0.8fr,1.2fr]">
        <div className={`rounded-[1.9rem] border p-6 ${isDark ? "border-white/10 bg-white/[0.03]" : "border-slate-200 bg-slate-50/80"}`}>
          <div className="flex items-center gap-3">
            <div className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl ${isDark ? "bg-cyan-400/10 text-cyan-300" : "bg-blue-100 text-blue-700"}`}>
              <Activity size={18} />
            </div>
            <div>
              <div className="text-xl font-black">Next Action</div>
              <div className={`text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                {pendingCases.length
                  ? `${pendingCases.length} consultation request${pendingCases.length > 1 ? "s" : ""} require review.`
                  : "No pending consultation requests right now."}
              </div>
            </div>
          </div>
          <div className="mt-5 space-y-3">
            {nextActionItems.length ? (
              nextActionItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleOverview(item.id)}
                  className={`w-full rounded-2xl border px-4 py-4 text-left transition-all ${isDark ? "border-white/10 bg-white/[0.03] hover:bg-white/[0.05]" : "border-slate-200 bg-white hover:bg-slate-50"}`}
                >
                  <div className="font-bold">{item.patientName}</div>
                  <div className={`mt-1 text-sm ${isDark ? "text-amber-300" : "text-amber-700"}`}>Pending review</div>
                  <div className={`mt-2 text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>{item.reason}</div>
                </button>
              ))
            ) : (
              <div className={`rounded-2xl border border-dashed px-4 py-10 text-center ${isDark ? "border-white/10 text-slate-500" : "border-slate-200 text-slate-400"}`}>
                Your review queue is clear.
              </div>
            )}
          </div>
        </div>

        <div className={`rounded-[1.9rem] border p-6 ${isDark ? "border-white/10 bg-white/[0.03]" : "border-slate-200 bg-slate-50/80"}`}>
          <div className="flex items-center gap-3">
            <div className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl ${isDark ? "bg-emerald-400/10 text-emerald-300" : "bg-emerald-100 text-emerald-700"}`}>
              <CalendarDays size={18} />
            </div>
            <div>
              <div className="text-xl font-black">Pending Consultation Requests</div>
              <div className={`text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                Accept or reject requests after checking the patient overview, trends, and anomalies.
              </div>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {pendingCases.length ? (
              pendingCases.map((item) => (
                <div key={item.id} className={`rounded-2xl border px-4 py-4 ${isDark ? "border-white/10 bg-white/[0.03]" : "border-slate-200 bg-white"}`}>
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <div className="font-bold">{item.patient?.full_name || item.patient_name || "Patient"}</div>
                      <div className={`mt-1 text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                        {[item.patient?.age ? `${item.patient.age}y` : null, item.patient?.gender, item.patient?.blood_group].filter(Boolean).join(" • ") || "Patient demographics pending"}
                      </div>
                      <div className={`mt-2 text-sm ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                        {item.reports?.[0]?.insights?.[0] || item.description || "Consultation request awaiting doctor review."}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleOverview(item.id)}
                        className={`rounded-xl px-4 py-2 text-sm font-bold ${isDark ? "bg-white/5 text-slate-100 hover:bg-white/10" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}
                      >
                        Overview
                      </button>
                      <Link
                        to={`/doctor/case/${item.id}`}
                        className={`rounded-xl px-4 py-2 text-sm font-bold ${isDark ? "bg-cyan-500/10 text-cyan-200 hover:bg-cyan-500/15" : "bg-cyan-50 text-cyan-700 hover:bg-cyan-100"}`}
                      >
                        Open Case
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleAccept(item.id)}
                        disabled={actingId === item.id}
                        className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-500 disabled:opacity-60"
                      >
                        Accept
                      </button>
                      <button
                        type="button"
                        onClick={() => handleReject(item.id)}
                        disabled={actingId === item.id}
                        className={`rounded-xl px-4 py-2 text-sm font-bold ${isDark ? "bg-red-500/10 text-red-300 hover:bg-red-500/15" : "bg-red-50 text-red-700 hover:bg-red-100"}`}
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className={`rounded-2xl border border-dashed px-4 py-10 text-center ${isDark ? "border-white/10 text-slate-500" : "border-slate-200 text-slate-400"}`}>
                No pending consultation requests assigned to you.
              </div>
            )}
          </div>
        </div>
      </section>

      <section className={`rounded-[1.9rem] border p-6 ${isDark ? "border-white/10 bg-white/[0.03]" : "border-slate-200 bg-slate-50/80"}`}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl ${isDark ? "bg-violet-400/10 text-violet-300" : "bg-violet-100 text-violet-700"}`}>
              <CalendarDays size={18} />
            </div>
            <div>
              <div className="text-xl font-black">Upcoming Appointments</div>
              <div className={`text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                Scheduled follow-ups for accepted consultations.
              </div>
            </div>
          </div>
          <Link
            to="/doctor/calendar"
            className={`rounded-2xl px-4 py-3 text-sm font-bold ${isDark ? "bg-white/5 text-slate-100 hover:bg-white/10" : "bg-white text-slate-700 hover:bg-slate-100"}`}
          >
            Open Calendar
          </Link>
        </div>

        <div className="mt-5 space-y-3">
          {upcomingAppointments.length ? (
            upcomingAppointments.map((appointment) => (
              <div key={appointment.id} className={`rounded-2xl border px-4 py-4 ${isDark ? "border-white/10 bg-white/[0.03]" : "border-slate-200 bg-white"}`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="font-bold">{appointment.patient_name || "Patient"}</div>
                    <div className={`mt-1 text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>{appointment.title}</div>
                    <div className={`mt-2 text-sm ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                      {new Date(appointment.date_time).toLocaleString()} • {appointment.location || "Location pending"}
                    </div>
                  </div>
                  <Link
                    to={`/doctor/case/${appointment.case_id}`}
                    className={`rounded-xl px-4 py-2 text-sm font-bold ${isDark ? "bg-cyan-500/10 text-cyan-200 hover:bg-cyan-500/15" : "bg-cyan-50 text-cyan-700 hover:bg-cyan-100"}`}
                  >
                    Open Case
                  </Link>
                </div>
              </div>
            ))
          ) : (
            <div className={`rounded-2xl border border-dashed px-4 py-10 text-center ${isDark ? "border-white/10 text-slate-500" : "border-slate-200 text-slate-400"}`}>
              No upcoming appointments are booked yet.
            </div>
          )}
        </div>
      </section>

      <OverviewModal
        caseItem={overviewCase}
        trendOverview={overviewTrends}
        loading={overviewLoading}
        isDark={isDark}
        actingId={actingId}
        onClose={() => {
          setOverviewCase(null);
          setOverviewTrends(null);
        }}
        onAccept={handleAccept}
        onReject={handleReject}
      />
    </div>
  );
}

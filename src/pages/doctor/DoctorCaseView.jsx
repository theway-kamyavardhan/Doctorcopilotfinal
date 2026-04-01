import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  AlertTriangle,
  CalendarDays,
  ChevronLeft,
  Clock3,
  FileSearch,
  LoaderCircle,
  MessageSquare,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";
import { useTheme } from "../../context/ThemeContext";
import { getDoctorCase, getPatientTrendOverview, requestDoctorReportAccess } from "../../services/doctor.service";
import appointmentService from "../../services/appointment.service";

function formatDateTime(value) {
  if (!value) return "Not scheduled";
  return new Date(value).toLocaleString();
}

function SectionCard({ title, icon: Icon, isDark, children, action = null }) {
  return (
    <section className={`rounded-[1.8rem] border p-5 ${isDark ? "border-white/10 bg-white/[0.03]" : "border-slate-200 bg-slate-50/80"}`}>
      <div className="flex items-center justify-between gap-3">
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

export default function DoctorCaseView() {
  const { isDark } = useTheme();
  const { id } = useParams();
  const navigate = useNavigate();
  const [caseItem, setCaseItem] = useState(null);
  const [trends, setTrends] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [requestingAccess, setRequestingAccess] = useState(false);
  const [error, setError] = useState("");

  const loadCaseWorkspace = async () => {
    if (!id) return;
    try {
      const caseData = await getDoctorCase(id);
      setCaseItem(caseData);

      const requests = [
        appointmentService.getDoctorAppointments(),
      ];
      if (caseData?.patient?.id) {
        requests.unshift(getPatientTrendOverview(caseData.patient.id));
      }

      const results = await Promise.all(requests);
      if (caseData?.patient?.id) {
        setTrends(results[0]);
        setAppointments((results[1] || []).filter((item) => item.case_id === caseData.id));
      } else {
        setTrends(null);
        setAppointments((results[0] || []).filter((item) => item.case_id === caseData.id));
      }

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
  const topInsights = latestReport?.insights?.slice(0, 4) || [];
  const anomalyList = (trends?.anomalies || []).slice(0, 4);
  const metricCards = useMemo(
    () =>
      Object.entries(trends?.metrics || {})
        .slice(0, 4)
        .map(([name, metric]) => ({
          key: name,
          label: name.replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase()),
          metric,
        })),
    [trends],
  );

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
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            to="/doctor/cases"
            className={`inline-flex items-center gap-2 text-sm font-bold ${isDark ? "text-cyan-300" : "text-blue-700"}`}
          >
            <ChevronLeft size={16} />
            Back to cases
          </Link>
          <h1 className={`mt-3 text-4xl font-black tracking-tight ${isDark ? "text-white" : "text-slate-900"}`}>
            {caseItem.patient?.full_name || "Patient Case"}
          </h1>
          <p className={`mt-2 text-base ${isDark ? "text-slate-400" : "text-slate-500"}`}>
            {caseItem.title} • {caseItem.status} consultation
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
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

      {error ? (
        <div className={`rounded-2xl px-4 py-3 text-sm font-semibold ${isDark ? "bg-red-500/10 text-red-300" : "bg-red-50 text-red-700"}`}>
          {error}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-6">
          <SectionCard title="Case Snapshot" icon={ShieldCheck} isDark={isDark}>
            <div className="grid gap-4 md:grid-cols-4">
              <div>
                <div className={`text-xs font-black uppercase tracking-[0.18em] ${isDark ? "text-slate-500" : "text-slate-400"}`}>Patient ID</div>
                <div className="mt-2 font-bold">{caseItem.patient?.patient_id || "Unknown"}</div>
              </div>
              <div>
                <div className={`text-xs font-black uppercase tracking-[0.18em] ${isDark ? "text-slate-500" : "text-slate-400"}`}>Demographics</div>
                <div className="mt-2 font-bold">
                  {[caseItem.patient?.age ? `${caseItem.patient.age}y` : null, caseItem.patient?.gender, caseItem.patient?.blood_group].filter(Boolean).join(" • ") || "Unavailable"}
                </div>
              </div>
              <div>
                <div className={`text-xs font-black uppercase tracking-[0.18em] ${isDark ? "text-slate-500" : "text-slate-400"}`}>Reports</div>
                <div className="mt-2 font-bold">{caseItem.report_count}</div>
              </div>
              <div>
                <div className={`text-xs font-black uppercase tracking-[0.18em] ${isDark ? "text-slate-500" : "text-slate-400"}`}>Messages</div>
                <div className="mt-2 font-bold">{caseItem.message_count}</div>
              </div>
            </div>
            <div className={`mt-4 rounded-2xl px-4 py-3 text-sm ${isDark ? "bg-white/5 text-slate-300" : "bg-white text-slate-700"}`}>
              {caseItem.description || "No case description was provided."}
            </div>
          </SectionCard>

          <SectionCard title="Patient-wide Trends" icon={TrendingUp} isDark={isDark}>
            <div className="space-y-3">
              {(trends?.summary || ["No trend summary available yet."]).slice(0, 5).map((item, index) => (
                <div key={`${item}-${index}`} className={`rounded-2xl px-4 py-3 text-sm ${isDark ? "bg-white/5 text-slate-200" : "bg-white text-slate-700"}`}>
                  {item}
                </div>
              ))}
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {metricCards.length ? metricCards.map(({ key, label, metric }) => (
                <div key={key} className={`rounded-2xl px-4 py-3 ${isDark ? "bg-slate-950 text-slate-200" : "bg-white text-slate-700"}`}>
                  <div className="font-bold">{label}</div>
                  <div className={`mt-1 text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                    {metric.direction} {metric.change ? `• ${metric.change}` : ""} {metric.stability ? `• ${metric.stability}` : ""}
                  </div>
                </div>
              )) : null}
            </div>
          </SectionCard>

          <SectionCard title="Linked Reports" icon={FileSearch} isDark={isDark}>
            <div className="space-y-3">
              {(caseItem.reports || []).length ? caseItem.reports.map((report) => (
                <div key={report.id} className={`rounded-2xl px-4 py-4 ${isDark ? "bg-white/5" : "bg-white"}`}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="font-bold">{report.report_type || "Clinical Report"}</div>
                      <div className={`mt-1 text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                        {[report.report_date, report.lab_name].filter(Boolean).join(" • ") || "Report metadata unavailable"}
                      </div>
                    </div>
                    <div className={`rounded-full px-3 py-1 text-xs font-black uppercase tracking-[0.16em] ${isDark ? "bg-cyan-500/10 text-cyan-200" : "bg-cyan-50 text-cyan-700"}`}>
                      {report.report_category || "general"}
                    </div>
                  </div>
                  {report.insights?.[0] ? (
                    <div className={`mt-3 text-sm ${isDark ? "text-slate-300" : "text-slate-600"}`}>{report.insights[0]}</div>
                  ) : null}
                </div>
              )) : (
                <div className={`rounded-2xl border border-dashed px-4 py-8 text-center ${isDark ? "border-white/10 text-slate-500" : "border-slate-200 text-slate-400"}`}>
                  No reports linked to this case yet.
                </div>
              )}
            </div>
          </SectionCard>
        </div>

        <div className="space-y-6">
          <SectionCard
            title="Report Access"
            icon={ShieldCheck}
            isDark={isDark}
            action={
              <button
                type="button"
                onClick={handleRequestAccess}
                disabled={requestingAccess || caseItem.report_access_status === "requested"}
                className={`rounded-xl px-4 py-2 text-sm font-bold ${isDark ? "bg-white/5 text-slate-100 hover:bg-white/10" : "bg-white text-slate-700 hover:bg-slate-100"} disabled:opacity-60`}
              >
                {caseItem.report_access_status === "denied" ? "Request Again" : "Request Access"}
              </button>
            }
          >
            <div className={`rounded-2xl px-4 py-3 text-sm ${
              caseItem.report_access_status === "granted"
                ? isDark ? "bg-emerald-500/10 text-emerald-200" : "bg-emerald-50 text-emerald-700"
                : caseItem.report_access_status === "requested"
                  ? isDark ? "bg-amber-500/10 text-amber-200" : "bg-amber-50 text-amber-700"
                  : caseItem.report_access_status === "denied"
                    ? isDark ? "bg-red-500/10 text-red-200" : "bg-red-50 text-red-700"
                    : isDark ? "bg-white/5 text-slate-300" : "bg-white text-slate-700"
            }`}>
              {caseItem.report_access_status === "granted"
                ? "Patient granted access. Linked reports can be reviewed normally."
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
                  className={`rounded-2xl px-4 py-3 text-sm ${
                    anomaly.severity === "critical"
                      ? isDark ? "bg-red-500/10 text-red-200" : "bg-red-50 text-red-700"
                      : isDark ? "bg-amber-500/10 text-amber-200" : "bg-amber-50 text-amber-700"
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
              {topInsights.length ? topInsights.map((insight, index) => (
                <div key={`${insight}-${index}`} className={`rounded-2xl px-4 py-3 text-sm ${isDark ? "bg-white/5 text-slate-200" : "bg-white text-slate-700"}`}>
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
    </div>
  );
}

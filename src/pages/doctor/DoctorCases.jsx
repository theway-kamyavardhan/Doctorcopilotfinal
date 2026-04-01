import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  AlertTriangle,
  CheckCircle2,
  CornerRightUp,
  FileSearch,
  LoaderCircle,
  MessageSquarePlus,
  RefreshCcw,
  Search,
  TrendingUp,
  UserRoundSearch,
  XCircle,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../../context/ThemeContext";
import {
  acceptDoctorCase,
  createDoctorConsultation,
  deleteDoctorCase,
  getDoctorCase,
  getDoctorCases,
  getDoctorDirectory,
  getDoctorProfile,
  getPatientTrendOverview,
  referDoctorCase,
  rejectDoctorCase,
  requestDoctorReportAccess,
  searchDoctorPatients,
} from "../../services/doctor.service";

function formatDate(value) {
  if (!value) return "Date pending";
  return new Date(value).toLocaleDateString();
}

function RequestOriginBadge({ item, isDark }) {
  const isReferral = item.request_origin === "doctor_referral";
  return (
    <div
      className={`rounded-full px-3 py-1 text-xs font-black uppercase tracking-[0.16em] ${
        isReferral
          ? isDark
            ? "bg-violet-500/15 text-violet-200"
            : "bg-violet-50 text-violet-700"
          : isDark
            ? "bg-cyan-500/10 text-cyan-200"
            : "bg-cyan-50 text-cyan-700"
      }`}
    >
      {isReferral ? "Specialist Referral" : "Patient Request"}
    </div>
  );
}

function OverlayFrame({ title, subtitle, isDark, onClose, children, maxWidth = "max-w-4xl" }) {
  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4">
      <div
        className={`w-full ${maxWidth} rounded-[2rem] border ${
          isDark
            ? "border-slate-800 bg-slate-950 text-white shadow-[0_28px_90px_rgba(2,6,23,0.65)]"
            : "border-slate-200 bg-white text-slate-900 shadow-[0_24px_80px_rgba(15,23,42,0.16)]"
        }`}
      >
        <div className={`flex items-start justify-between gap-4 border-b px-6 py-5 md:px-8 ${isDark ? "border-slate-800" : "border-slate-200"}`}>
          <div>
            <div className={`text-[11px] font-black uppercase tracking-[0.22em] ${isDark ? "text-cyan-300/75" : "text-blue-700/75"}`}>{title}</div>
            <p className={`mt-2 text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>{subtitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`rounded-2xl px-4 py-2 text-sm font-bold transition-colors ${isDark ? "bg-white/5 text-slate-100 hover:bg-white/10" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}
          >
            Close
          </button>
        </div>
        <div className="max-h-[78vh] overflow-y-auto px-6 py-6 md:px-8 md:py-7">{children}</div>
      </div>
    </div>,
    document.body
  );
}

function ReferModal({ open, doctors, currentDoctorId, caseItem, isDark, onClose, onSubmit, submitting }) {
  const [selectedDoctorId, setSelectedDoctorId] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    if (!open) return;
    const firstCandidate = doctors.find((doctor) => doctor.id !== currentDoctorId);
    setSelectedDoctorId(firstCandidate?.id || "");
    setNote(caseItem?.referral_note || "");
  }, [open, doctors, currentDoctorId, caseItem]);

  if (!open) return null;

  const availableDoctors = doctors.filter((doctor) => doctor.id !== currentDoctorId);

  return (
    <OverlayFrame
      title="Refer Case"
      subtitle="Forward this case to another doctor. They will receive it as a specialist referral request."
      isDark={isDark}
      onClose={onClose}
      maxWidth="max-w-2xl"
    >
      <div className="space-y-5">
        <div>
          <h3 className="text-2xl font-black tracking-tight">{caseItem?.patient?.full_name || "Patient"}</h3>
          <p className={`mt-2 text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>
            Choose the specialist who should continue this case and add referral context if needed.
          </p>
        </div>

        <div>
          <label className={`text-xs font-black uppercase tracking-[0.18em] ${isDark ? "text-slate-500" : "text-slate-400"}`}>
            Select Doctor
          </label>
          <div className="mt-3 space-y-2">
            {availableDoctors.map((doctor) => (
              <button
                key={doctor.id}
                type="button"
                onClick={() => setSelectedDoctorId(doctor.id)}
                className={`w-full rounded-2xl border p-4 text-left transition-all ${
                  selectedDoctorId === doctor.id
                    ? isDark
                      ? "border-cyan-500/40 bg-slate-900"
                      : "border-cyan-300 bg-cyan-50"
                    : isDark
                      ? "border-slate-800 bg-slate-900 hover:bg-slate-900/90"
                      : "border-slate-200 bg-slate-50 hover:bg-white"
                }`}
              >
                <div className="font-bold">{doctor.full_name}</div>
                <div className={`mt-1 text-sm ${isDark ? "text-cyan-300" : "text-blue-700"}`}>{doctor.specialization}</div>
                <div className={`mt-2 text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                  {[doctor.hospital, doctor.location].filter(Boolean).join(" • ") || "Hospital details pending"}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className={`text-xs font-black uppercase tracking-[0.18em] ${isDark ? "text-slate-500" : "text-slate-400"}`}>
            Referral Note
          </label>
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            rows={4}
              className={`mt-3 w-full rounded-2xl border px-4 py-3 text-sm outline-none ${
                isDark ? "border-slate-800 bg-slate-900 text-white placeholder:text-slate-500" : "border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400"
              }`}
              placeholder="Explain why this case should be reviewed by the specialist."
            />
        </div>

        <button
          type="button"
          onClick={() => onSubmit(selectedDoctorId, note)}
          disabled={!selectedDoctorId || submitting}
          className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 font-bold text-white transition-colors hover:bg-blue-500 disabled:opacity-60"
        >
          <CornerRightUp size={16} />
          {submitting ? "Referring..." : "Send Specialist Referral"}
        </button>
      </div>
    </OverlayFrame>
  );
}

function OverviewModal({ open, caseItem, trendData, loading, isDark, onClose }) {
  if (!open) return null;

  return (
    <OverlayFrame
      title="Case Overview"
      subtitle="Inspect the full patient context, report-backed trends, and anomalies before deciding on the request."
      isDark={isDark}
      onClose={onClose}
      maxWidth="max-w-5xl"
    >
      {loading ? (
        <div className="flex min-h-[18rem] items-center justify-center">
          <LoaderCircle size={28} className="animate-spin text-cyan-400" />
        </div>
      ) : caseItem ? (
        <div className="space-y-4">
          <div className={`rounded-2xl border p-4 ${isDark ? "border-slate-800 bg-slate-900" : "border-slate-200 bg-white"}`}>
            <div className="flex flex-wrap items-center gap-2">
              <div className="text-2xl font-black">{caseItem.patient?.full_name || "Patient"}</div>
              <RequestOriginBadge item={caseItem} isDark={isDark} />
            </div>
            <div className={`mt-2 text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>
              {[caseItem.patient?.age ? `${caseItem.patient.age}y` : null, caseItem.patient?.gender, caseItem.patient?.blood_group].filter(Boolean).join(" • ") || "Demographics unavailable"}
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className={`rounded-2xl border p-4 ${isDark ? "border-slate-800 bg-slate-900" : "border-slate-200 bg-white"}`}>
              <div className="font-bold">Request Summary</div>
              <div className={`mt-2 text-sm leading-6 ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                {caseItem.request_origin === "doctor_referral"
                  ? `Specialist referral from ${caseItem.referred_by_doctor_name || "another doctor"}${caseItem.referral_note ? ` • ${caseItem.referral_note}` : ""}`
                  : caseItem.description || "No request description available."}
              </div>
            </div>

            <div className={`rounded-2xl border p-4 ${isDark ? "border-slate-800 bg-slate-900" : "border-slate-200 bg-white"}`}>
              <div className="font-bold">Case Facts</div>
              <div className={`mt-2 space-y-2 text-sm ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                <div>Status: <span className="font-semibold capitalize">{caseItem.status}</span></div>
                <div>Reports: <span className="font-semibold">{caseItem.report_count || 0}</span></div>
                <div>Messages: <span className="font-semibold">{caseItem.message_count || 0}</span></div>
                <div>Patient ID: <span className="font-semibold">{caseItem.patient?.patient_id || "Unavailable"}</span></div>
              </div>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className={`rounded-2xl border p-4 ${isDark ? "border-slate-800 bg-slate-900" : "border-slate-200 bg-white"}`}>
              <div className="flex items-center gap-2 font-bold">
                <TrendingUp size={16} />
                General Trends
              </div>
              <div className="mt-3 space-y-2">
                {(trendData?.summary || []).slice(0, 5).map((item, index) => (
                  <div key={`${item}-${index}`} className={`rounded-xl px-3 py-2 text-sm ${isDark ? "bg-slate-950/60 text-slate-200" : "bg-slate-50 text-slate-700"}`}>
                    {item}
                  </div>
                ))}
                {!trendData?.summary?.length ? (
                  <div className={`text-sm ${isDark ? "text-slate-500" : "text-slate-400"}`}>No patient-wide trend summary available yet.</div>
                ) : null}
              </div>
            </div>

            <div className={`rounded-2xl border p-4 ${isDark ? "border-white/10 bg-white/[0.04]" : "border-slate-200 bg-white/90"}`}>
              <div className="flex items-center gap-2 font-bold">
                <AlertTriangle size={16} />
                Anomalies
              </div>
              <div className="mt-3 space-y-2">
                {(trendData?.anomalies || []).slice(0, 5).map((anomaly, index) => (
                  <div
                    key={`${anomaly.parameter}-${index}`}
                    className={`rounded-xl px-3 py-2 text-sm ${
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
                {!trendData?.anomalies?.length ? (
                  <div className={`text-sm ${isDark ? "text-slate-500" : "text-slate-400"}`}>No anomalies detected across the patient record.</div>
                ) : null}
              </div>
            </div>
          </div>

          <div className={`rounded-2xl border p-4 ${isDark ? "border-slate-800 bg-slate-900" : "border-slate-200 bg-white"}`}>
            <div className="font-bold">Recent Reports</div>
            <div className="mt-3 space-y-3">
              {(caseItem.reports || []).slice(0, 3).map((report) => (
                <div key={report.id} className={`rounded-2xl px-4 py-3 ${isDark ? "bg-slate-950/60" : "bg-slate-50"}`}>
                  <div className="font-semibold">{report.report_type || "Clinical Report"}</div>
                  <div className={`mt-1 text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                    {[report.report_date, report.lab_name].filter(Boolean).join(" • ") || "Report metadata unavailable"}
                  </div>
                  {report.insights?.[0] ? (
                    <div className={`mt-2 text-sm ${isDark ? "text-slate-300" : "text-slate-600"}`}>{report.insights[0]}</div>
                  ) : null}
                </div>
              ))}
              {!caseItem.reports?.length ? (
                <div className={`text-sm ${isDark ? "text-slate-500" : "text-slate-400"}`}>No reports linked yet.</div>
              ) : null}
            </div>
          </div>
        </div>
      ) : (
        <div className={`rounded-2xl border border-dashed px-4 py-12 text-center ${isDark ? "border-white/10 text-slate-500" : "border-slate-200 text-slate-400"}`}>
          No overview available for this case.
        </div>
      )}
    </OverlayFrame>
  );
}

function StartConsultationModal({
  open,
  isDark,
  search,
  onSearchChange,
  patients,
  selectedPatientId,
  onSelectPatient,
  title,
  onTitleChange,
  description,
  onDescriptionChange,
  onSubmit,
  loading,
  onClose,
}) {
  if (!open) return null;

  const selectedPatient = patients.find((item) => item.id === selectedPatientId);

  return (
    <OverlayFrame
      title="New Consultation"
      subtitle="Search for a patient, review the basic profile, and start a direct doctor-led consultation."
      isDark={isDark}
      onClose={onClose}
      maxWidth="max-w-4xl"
    >
      <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-4">
          <div>
            <label className={`text-xs font-black uppercase tracking-[0.18em] ${isDark ? "text-slate-500" : "text-slate-400"}`}>
              Search Patients
            </label>
            <div className={`mt-3 flex items-center gap-3 rounded-2xl border px-4 py-3 ${isDark ? "border-slate-800 bg-slate-900" : "border-slate-200 bg-slate-50"}`}>
              <Search size={16} className={isDark ? "text-slate-500" : "text-slate-400"} />
              <input
                value={search}
                onChange={(event) => onSearchChange(event.target.value)}
                placeholder="Search by patient ID, name, phone, or gender"
                className={`w-full bg-transparent text-sm outline-none ${isDark ? "text-white placeholder:text-slate-500" : "text-slate-900 placeholder:text-slate-400"}`}
              />
            </div>
          </div>

          <div className="space-y-2">
            {patients.length ? (
              patients.map((patient) => (
                <button
                  key={patient.id}
                  type="button"
                  onClick={() => onSelectPatient(patient.id)}
                  className={`w-full rounded-2xl border p-4 text-left transition-all ${
                    selectedPatientId === patient.id
                      ? isDark
                        ? "border-cyan-500/40 bg-slate-900"
                        : "border-cyan-300 bg-cyan-50"
                      : isDark
                        ? "border-slate-800 bg-slate-950 hover:bg-slate-900"
                        : "border-slate-200 bg-white hover:bg-slate-50"
                  }`}
                >
                  <div className="font-bold">{patient.full_name}</div>
                  <div className={`mt-1 text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                    {[patient.patient_id, patient.age ? `${patient.age}y` : null, patient.gender, patient.blood_group].filter(Boolean).join(" • ") || "Profile details limited"}
                  </div>
                </button>
              ))
            ) : (
              <div className={`rounded-2xl border border-dashed px-4 py-10 text-center text-sm ${isDark ? "border-slate-800 text-slate-500" : "border-slate-200 text-slate-400"}`}>
                No patients matched your search.
              </div>
            )}
          </div>
        </div>

        <div className={`rounded-[1.8rem] border p-5 ${isDark ? "border-slate-800 bg-slate-900" : "border-slate-200 bg-white"}`}>
          <div className="text-lg font-black">Consultation Setup</div>
          <p className={`mt-2 text-sm leading-6 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
            This will open a doctor-initiated consultation and send the patient the first chat message automatically.
          </p>

          <div className="mt-5 space-y-4">
            <div>
              <label className={`text-xs font-black uppercase tracking-[0.18em] ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                Selected Patient
              </label>
              <div className={`mt-2 rounded-2xl px-4 py-3 text-sm ${isDark ? "bg-slate-950 text-slate-200" : "bg-slate-50 text-slate-700"}`}>
                {selectedPatient ? selectedPatient.full_name : "Choose a patient from the search list."}
              </div>
            </div>

            <div>
              <label className={`text-xs font-black uppercase tracking-[0.18em] ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                Title
              </label>
              <input
                value={title}
                onChange={(event) => onTitleChange(event.target.value)}
                placeholder="Consultation Intake"
                className={`mt-2 w-full rounded-2xl border px-4 py-3 text-sm outline-none ${isDark ? "border-slate-800 bg-slate-950 text-white placeholder:text-slate-500" : "border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400"}`}
              />
            </div>

            <div>
              <label className={`text-xs font-black uppercase tracking-[0.18em] ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                Opening Note
              </label>
              <textarea
                value={description}
                onChange={(event) => onDescriptionChange(event.target.value)}
                rows={5}
                placeholder="Share why you are opening this consultation and what you want to review."
                className={`mt-2 w-full rounded-2xl border px-4 py-3 text-sm outline-none ${isDark ? "border-slate-800 bg-slate-950 text-white placeholder:text-slate-500" : "border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400"}`}
              />
            </div>

            <button
              type="button"
              onClick={onSubmit}
              disabled={!selectedPatientId || loading}
              className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 font-bold text-white transition-colors hover:bg-blue-500 disabled:opacity-60"
            >
              <MessageSquarePlus size={16} />
              {loading ? "Starting..." : "Start Consultation"}
            </button>
          </div>
        </div>
      </div>
    </OverlayFrame>
  );
}

export default function DoctorCases() {
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const [cases, setCases] = useState([]);
  const [selectedCase, setSelectedCase] = useState(null);
  const [selectedTrends, setSelectedTrends] = useState(null);
  const [doctors, setDoctors] = useState([]);
  const [patients, setPatients] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionId, setActionId] = useState("");
  const [referOpen, setReferOpen] = useState(false);
  const [referCase, setReferCase] = useState(null);
  const [overviewOpen, setOverviewOpen] = useState(false);
  const [startOpen, setStartOpen] = useState(false);
  const [patientSearch, setPatientSearch] = useState("");
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [consultationTitle, setConsultationTitle] = useState("Consultation Intake");
  const [consultationDescription, setConsultationDescription] = useState("");
  const [error, setError] = useState("");

  const activeCases = useMemo(
    () => cases.filter((item) => item.status !== "closed" && item.status !== "transferred"),
    [cases]
  );
  const archivedCases = useMemo(
    () => cases.filter((item) => item.status === "closed" || item.status === "transferred"),
    [cases]
  );
  const pendingCases = useMemo(
    () => activeCases.filter((item) => item.status === "pending"),
    [activeCases]
  );
  const acceptedCases = useMemo(
    () => activeCases.filter((item) => item.status === "open" || item.status === "in_review"),
    [activeCases]
  );

  const loadCases = async () => {
    try {
      const [caseData, doctorData] = await Promise.all([getDoctorCases(), getDoctorDirectory()]);
      setCases(caseData || []);
      setDoctors(doctorData || []);
      setError("");
    } catch (loadError) {
      setError(loadError.message || "Failed to load doctor cases.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCases();
  }, []);

  useEffect(() => {
    getDoctorProfile().then(setProfile).catch(() => {});
  }, []);

  useEffect(() => {
    if (!startOpen) return undefined;

    const timer = window.setTimeout(async () => {
      try {
        const results = await searchDoctorPatients(patientSearch);
        setPatients(results || []);
      } catch (searchError) {
        setError(searchError.message || "Failed to search patients.");
      }
    }, 250);

    return () => window.clearTimeout(timer);
  }, [patientSearch, startOpen]);

  const handleSelectCase = async (caseId) => {
    setOverviewOpen(true);
    setDetailLoading(true);
    try {
      const data = await getDoctorCase(caseId);
      setSelectedCase(data);
      if (data?.patient?.id) {
        const trends = await getPatientTrendOverview(data.patient.id);
        setSelectedTrends(trends);
      } else {
        setSelectedTrends(null);
      }
      setError("");
    } catch (loadError) {
      setError(loadError.message || "Failed to load case overview.");
      setOverviewOpen(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleAccept = async (caseId) => {
    setActionId(caseId);
    try {
      await acceptDoctorCase(caseId);
      await loadCases();
      if (selectedCase?.id === caseId) {
        await handleSelectCase(caseId);
      }
    } catch (actionError) {
      setError(actionError.message || "Failed to accept case.");
    } finally {
      setActionId("");
    }
  };

  const handleReject = async (caseId) => {
    setActionId(caseId);
    try {
      await rejectDoctorCase(caseId);
      if (selectedCase?.id === caseId) {
        setSelectedCase(null);
        setSelectedTrends(null);
        setOverviewOpen(false);
      }
      await loadCases();
    } catch (actionError) {
      setError(actionError.message || "Failed to reject case.");
    } finally {
      setActionId("");
    }
  };

  const handleReferOpen = (caseItem) => {
    setReferCase(caseItem);
    setReferOpen(true);
  };

  const handleStartOpen = async () => {
    setStartOpen(true);
    setPatientSearch("");
    setSelectedPatientId("");
    setConsultationTitle("Consultation Intake");
    setConsultationDescription("");
    try {
      const results = await searchDoctorPatients("");
      setPatients(results || []);
      setError("");
    } catch (loadError) {
      setError(loadError.message || "Failed to load patients.");
    }
  };

  const handleReferSubmit = async (doctorId, note) => {
    if (!referCase?.id) return;
    setActionId(referCase.id);
    try {
      await referDoctorCase(referCase.id, doctorId, note);
      setReferOpen(false);
      setReferCase(null);
      if (selectedCase?.id === referCase.id) {
        setSelectedCase(null);
        setSelectedTrends(null);
        setOverviewOpen(false);
      }
      await loadCases();
    } catch (actionError) {
      setError(actionError.message || "Failed to refer case.");
    } finally {
      setActionId("");
    }
  };

  const handleStartConsultation = async () => {
    if (!selectedPatientId) return;
    setActionId("new-consultation");
    try {
      const created = await createDoctorConsultation({
        patient_id: selectedPatientId,
        title: consultationTitle.trim() || "Consultation Intake",
        description:
          consultationDescription.trim() || "Doctor opened a direct consultation and started the conversation.",
        type: "consultation_request",
      });
      setStartOpen(false);
      await loadCases();
      navigate(`/doctor/chats?case=${created.id}`);
    } catch (actionError) {
      setError(actionError.message || "Failed to start consultation.");
    } finally {
      setActionId("");
    }
  };

  const handleRequestReportAccess = async (caseId) => {
    setActionId(caseId);
    try {
      await requestDoctorReportAccess(caseId);
      await loadCases();
      if (selectedCase?.id === caseId) {
        await handleSelectCase(caseId);
      }
    } catch (actionError) {
      setError(actionError.message || "Failed to request report access.");
    } finally {
      setActionId("");
    }
  };

  const handleDeleteArchivedCase = async (caseId) => {
    const confirmed = window.confirm("Delete this archived case permanently? Linked reports will stay with the patient, but the case history, messages, and notes will be removed.");
    if (!confirmed) return;

    setActionId(caseId);
    try {
      await deleteDoctorCase(caseId);
      if (selectedCase?.id === caseId) {
        setSelectedCase(null);
        setSelectedTrends(null);
        setOverviewOpen(false);
      }
      await loadCases();
    } catch (actionError) {
      setError(actionError.message || "Failed to delete archived case.");
    } finally {
      setActionId("");
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <LoaderCircle size={28} className="animate-spin text-cyan-400" />
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <section className={`rounded-[1.9rem] border p-6 ${isDark ? "border-white/10 bg-white/[0.03]" : "border-slate-200 bg-slate-50/80"}`}>
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className={`text-[11px] font-black uppercase tracking-[0.24em] ${isDark ? "text-cyan-200/75" : "text-blue-700/75"}`}>
                Cases
              </div>
              <h2 className="mt-2 text-3xl font-bold tracking-tight">Active + Pending Queue</h2>
              <p className={`mt-2 text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                Pending patient requests and specialist referrals both appear here. Open overview in a focused overlay before you decide.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                onClick={loadCases}
                className={`inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold ${isDark ? "bg-white/5 text-slate-200 hover:bg-white/10" : "bg-white text-slate-700 hover:bg-slate-200"}`}
              >
                <RefreshCcw size={16} />
                Refresh
              </button>
              <button
                type="button"
                onClick={handleStartOpen}
                className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-blue-500"
              >
                <MessageSquarePlus size={16} />
                New Consultation
              </button>
            </div>
          </div>

          {error ? (
            <div className={`mt-5 rounded-2xl px-4 py-3 text-sm font-semibold ${isDark ? "bg-red-500/10 text-red-300" : "bg-red-50 text-red-700"}`}>
              {error}
            </div>
          ) : null}

          <div className="mt-5 space-y-6">
            <div>
              <div className={`mb-3 text-xs font-black uppercase tracking-[0.18em] ${isDark ? "text-amber-300/80" : "text-amber-700/80"}`}>
                Pending Requests
              </div>
              <div className="space-y-3">
                {pendingCases.length ? (
                  pendingCases.map((item) => {
                    const isReferral = item.request_origin === "doctor_referral";
                    return (
                      <div
                        key={item.id}
                        className={`rounded-2xl border px-4 py-4 ${isDark ? "border-white/10 bg-white/[0.03]" : "border-slate-200 bg-white"}`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <div className="font-bold">{item.patient?.full_name || item.patient_name || "Patient"}</div>
                              <RequestOriginBadge item={item} isDark={isDark} />
                              <div className="rounded-full bg-amber-500/10 px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-amber-500">
                                {item.status}
                              </div>
                            </div>
                            <div className={`text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                              {formatDate(item.created_at)} • {[item.patient?.age ? `${item.patient.age}y` : null, item.patient?.gender, item.patient?.blood_group].filter(Boolean).join(" • ") || "Patient demographics pending"}
                            </div>
                            <div className={`text-sm ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                              {isReferral
                                ? `Referred by ${item.referred_by_doctor_name || "another doctor"}${item.referral_note ? ` • ${item.referral_note}` : ""}`
                                : item.description || "No additional summary available."}
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleSelectCase(item.id)}
                            className={`rounded-xl px-4 py-2 text-sm font-bold ${isDark ? "bg-white/5 text-slate-100 hover:bg-white/10" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}
                          >
                            Overview
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAccept(item.id)}
                            disabled={actionId === item.id}
                            className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-500 disabled:opacity-60"
                          >
                            Accept
                          </button>
                          <button
                            type="button"
                            onClick={() => handleReject(item.id)}
                            disabled={actionId === item.id}
                            className={`rounded-xl px-4 py-2 text-sm font-bold ${isDark ? "bg-red-500/10 text-red-300 hover:bg-red-500/15" : "bg-red-50 text-red-700 hover:bg-red-100"}`}
                          >
                            Reject
                          </button>
                          <button
                            type="button"
                            onClick={() => handleReferOpen(item)}
                            disabled={actionId === item.id}
                            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold ${isDark ? "bg-violet-500/10 text-violet-200 hover:bg-violet-500/15" : "bg-violet-50 text-violet-700 hover:bg-violet-100"}`}
                          >
                            <CornerRightUp size={14} />
                            Refer
                          </button>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className={`rounded-2xl border border-dashed px-4 py-10 text-center ${isDark ? "border-white/10 text-slate-500" : "border-slate-200 text-slate-400"}`}>
                    No pending requests are assigned to you.
                  </div>
                )}
              </div>
            </div>

            <div>
              <div className={`mb-3 text-xs font-black uppercase tracking-[0.18em] ${isDark ? "text-emerald-300/80" : "text-emerald-700/80"}`}>
                Active Cases
              </div>
              <div className="space-y-3">
                {acceptedCases.length ? (
                  acceptedCases.map((item) => {
                    const isReferral = item.request_origin === "doctor_referral";
                    return (
                      <div
                        key={item.id}
                        className={`rounded-2xl border px-4 py-4 ${isDark ? "border-white/10 bg-white/[0.03]" : "border-slate-200 bg-white"}`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <div className="font-bold">{item.patient?.full_name || item.patient_name || "Patient"}</div>
                              <RequestOriginBadge item={item} isDark={isDark} />
                              <div className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-emerald-500">
                                {item.status}
                              </div>
                            </div>
                            <div className={`text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                              {formatDate(item.created_at)} • {[item.patient?.age ? `${item.patient.age}y` : null, item.patient?.gender, item.patient?.blood_group].filter(Boolean).join(" • ") || "Patient demographics pending"}
                            </div>
                            <div className={`text-sm ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                              {isReferral
                                ? `Accepted referral from ${item.referred_by_doctor_name || "another doctor"}${item.referral_note ? ` • ${item.referral_note}` : ""}`
                                : item.description || "No additional summary available."}
                            </div>
                            <div className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${
                              item.report_access_status === "granted"
                                ? isDark
                                  ? "bg-emerald-500/10 text-emerald-200"
                                  : "bg-emerald-50 text-emerald-700"
                                : item.report_access_status === "requested"
                                  ? isDark
                                    ? "bg-amber-500/10 text-amber-200"
                                    : "bg-amber-50 text-amber-700"
                                  : item.report_access_status === "denied"
                                    ? isDark
                                      ? "bg-red-500/10 text-red-200"
                                      : "bg-red-50 text-red-700"
                                    : isDark
                                      ? "bg-white/5 text-slate-300"
                                      : "bg-slate-100 text-slate-600"
                            }`}>
                              {item.report_access_status === "granted"
                                ? "Reports unlocked"
                                : item.report_access_status === "requested"
                                  ? "Waiting for report permission"
                                  : item.report_access_status === "denied"
                                    ? "Report access denied"
                                    : "No report request sent"}
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => navigate(`/doctor/case/${item.id}`)}
                            className={`rounded-xl px-4 py-2 text-sm font-bold ${isDark ? "bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/15" : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"}`}
                          >
                            Open Case
                          </button>
                          <button
                            type="button"
                            onClick={() => navigate(`/doctor/chats?case=${item.id}`)}
                            className={`rounded-xl px-4 py-2 text-sm font-bold ${isDark ? "bg-cyan-500/10 text-cyan-200 hover:bg-cyan-500/15" : "bg-cyan-50 text-cyan-700 hover:bg-cyan-100"}`}
                          >
                            Open Chat
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRequestReportAccess(item.id)}
                            disabled={actionId === item.id || item.report_access_status === "requested"}
                            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold ${
                              item.report_access_status === "granted"
                                ? isDark
                                  ? "bg-emerald-500/10 text-emerald-200"
                                  : "bg-emerald-50 text-emerald-700"
                                : item.report_access_status === "denied"
                                  ? isDark
                                    ? "bg-amber-500/10 text-amber-200 hover:bg-amber-500/15"
                                    : "bg-amber-50 text-amber-700 hover:bg-amber-100"
                                  : isDark
                                    ? "bg-white/5 text-slate-100 hover:bg-white/10"
                                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                            } disabled:opacity-60`}
                          >
                            <FileSearch size={14} />
                            {item.report_access_status === "granted"
                              ? "Report Access Granted"
                              : item.report_access_status === "requested"
                                ? "Access Requested"
                                : item.report_access_status === "denied"
                                  ? "Resend Access Request"
                                  : "Request Report Access"}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSelectCase(item.id)}
                            className={`rounded-xl px-4 py-2 text-sm font-bold ${isDark ? "bg-white/5 text-slate-100 hover:bg-white/10" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}
                          >
                            Refresh Overview
                          </button>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className={`rounded-2xl border border-dashed px-4 py-10 text-center ${isDark ? "border-white/10 text-slate-500" : "border-slate-200 text-slate-400"}`}>
                    No active accepted cases yet.
                  </div>
                )}
              </div>
            </div>

            <div>
              <div className={`mb-3 text-xs font-black uppercase tracking-[0.18em] ${isDark ? "text-slate-300/80" : "text-slate-600/80"}`}>
                Archived Cases
              </div>
              <div className="space-y-3">
                {archivedCases.length ? (
                  archivedCases.map((item) => (
                    <div
                      key={item.id}
                      className={`rounded-2xl border px-4 py-4 ${isDark ? "border-white/10 bg-white/[0.03]" : "border-slate-200 bg-white"}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="font-bold">{item.patient?.full_name || item.patient_name || "Patient"}</div>
                            <RequestOriginBadge item={item} isDark={isDark} />
                            <div className={`rounded-full px-3 py-1 text-xs font-black uppercase tracking-[0.16em] ${
                              item.status === "closed"
                                ? "bg-slate-500/10 text-slate-400"
                                : isDark
                                  ? "bg-violet-500/10 text-violet-200"
                                  : "bg-violet-50 text-violet-700"
                            }`}>
                              {item.status}
                            </div>
                          </div>
                          <div className={`text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                            {formatDate(item.updated_at || item.created_at)} • {[item.patient?.age ? `${item.patient.age}y` : null, item.patient?.gender, item.patient?.blood_group].filter(Boolean).join(" • ") || "Patient demographics pending"}
                          </div>
                          <div className={`text-sm ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                            {item.closing_note || item.description || "No archive summary available."}
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => navigate(`/doctor/case/${item.id}`)}
                          className={`rounded-xl px-4 py-2 text-sm font-bold ${isDark ? "bg-white/5 text-slate-100 hover:bg-white/10" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}
                        >
                          Open Case
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSelectCase(item.id)}
                          className={`rounded-xl px-4 py-2 text-sm font-bold ${isDark ? "bg-white/5 text-slate-100 hover:bg-white/10" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}
                        >
                          Overview
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteArchivedCase(item.id)}
                          disabled={actionId === item.id}
                          className={`rounded-xl px-4 py-2 text-sm font-bold ${
                            isDark
                              ? "bg-red-500/10 text-red-300 hover:bg-red-500/15"
                              : "bg-red-50 text-red-700 hover:bg-red-100"
                          } disabled:opacity-60`}
                        >
                          {actionId === item.id ? "Deleting..." : "Delete"}
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className={`rounded-2xl border border-dashed px-4 py-10 text-center ${isDark ? "border-white/10 text-slate-500" : "border-slate-200 text-slate-400"}`}>
                    No archived cases yet.
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>

      <OverviewModal
        open={overviewOpen}
        caseItem={selectedCase}
        trendData={selectedTrends}
        loading={detailLoading}
        isDark={isDark}
        onClose={() => {
          setOverviewOpen(false);
          setSelectedCase(null);
          setSelectedTrends(null);
        }}
      />

      <ReferModal
        open={referOpen}
        doctors={doctors}
        currentDoctorId={profile?.id}
        caseItem={referCase}
        isDark={isDark}
        onClose={() => {
          setReferOpen(false);
          setReferCase(null);
        }}
        onSubmit={handleReferSubmit}
        submitting={Boolean(actionId)}
      />

      <StartConsultationModal
        open={startOpen}
        isDark={isDark}
        search={patientSearch}
        onSearchChange={setPatientSearch}
        patients={patients}
        selectedPatientId={selectedPatientId}
        onSelectPatient={setSelectedPatientId}
        title={consultationTitle}
        onTitleChange={setConsultationTitle}
        description={consultationDescription}
        onDescriptionChange={setConsultationDescription}
        onSubmit={handleStartConsultation}
        loading={actionId === "new-consultation"}
        onClose={() => setStartOpen(false)}
      />
    </>
  );
}

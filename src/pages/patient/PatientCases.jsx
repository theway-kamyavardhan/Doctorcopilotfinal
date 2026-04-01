import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  ClipboardPlus,
  LoaderCircle,
  MessageSquareHeart,
  RefreshCcw,
  ShieldX,
  Stethoscope,
  X,
} from "lucide-react";
import { useTheme } from "../../context/ThemeContext";
import appointmentService from "../../services/appointment.service";
import caseService from "../../services/case.service";
import { getDoctorDirectory } from "../../services/doctor.service";

function formatDate(value) {
  if (!value) return "Date pending";
  return new Date(value).toLocaleDateString();
}

function statusTone(status, isDark) {
  if (status === "open" || status === "in_review") {
    return isDark ? "bg-emerald-500/10 text-emerald-300" : "bg-emerald-50 text-emerald-700";
  }
  if (status === "pending") {
    return isDark ? "bg-amber-500/10 text-amber-300" : "bg-amber-50 text-amber-700";
  }
  return isDark ? "bg-slate-500/10 text-slate-300" : "bg-slate-100 text-slate-700";
}

function DoctorOption({ doctor, selected, onSelect, isDark }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(doctor.id)}
      className={`w-full rounded-2xl border p-4 text-left transition-all ${
        selected
          ? isDark
            ? "border-cyan-400/40 bg-cyan-500/10 shadow-[0_0_0_1px_rgba(34,211,238,0.2)]"
            : "border-cyan-300 bg-cyan-50"
          : isDark
            ? "border-white/10 bg-white/[0.03] hover:bg-white/[0.05]"
            : "border-slate-200 bg-slate-50 hover:bg-white"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className={`font-bold ${isDark ? "text-white" : "text-slate-900"}`}>{doctor.full_name}</div>
          <div className={`mt-1 text-sm ${isDark ? "text-cyan-300" : "text-blue-700"}`}>{doctor.specialization}</div>
          <div className={`mt-2 text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>
            {[doctor.hospital, doctor.location].filter(Boolean).join(" • ") || "Hospital details pending"}
          </div>
        </div>
        <div
          className={`rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] ${
            selected ? "bg-cyan-500 text-slate-950" : isDark ? "bg-white/10 text-slate-300" : "bg-white text-slate-500"
          }`}
        >
          {selected ? "Selected" : doctor.license_number}
        </div>
      </div>
    </button>
  );
}

function RequestConsultationOverlay({
  doctors,
  selectedDoctor,
  selectedDoctorId,
  setSelectedDoctorId,
  activeCases,
  sameDoctorActiveCase,
  requesting,
  onClose,
  onSubmit,
  isDark,
}) {
  return createPortal(
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/60 px-4 py-8">
      <div
        className={`w-full max-w-5xl rounded-[2rem] border shadow-2xl ${
          isDark ? "border-white/10 bg-slate-950 text-white" : "border-slate-200 bg-white text-slate-900"
        }`}
      >
        <div className={`flex items-start justify-between gap-4 border-b px-6 py-5 ${isDark ? "border-white/10" : "border-slate-200"}`}>
          <div className="flex items-start gap-4">
            <div className={`rounded-2xl p-3 ${isDark ? "bg-cyan-500/10 text-cyan-300" : "bg-blue-50 text-blue-700"}`}>
              <ClipboardPlus size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-black">New Consultation Request</h2>
              <p className={`mt-2 max-w-2xl text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                Choose a doctor and send your request. A consultation with the same doctor cannot be created again until the current one is closed.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`inline-flex items-center justify-center rounded-2xl p-3 transition-colors ${
              isDark ? "bg-white/5 text-slate-300 hover:bg-white/10" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
            aria-label="Close consultation request overlay"
          >
            <X size={18} />
          </button>
        </div>

        <div className="grid gap-8 px-6 py-6 xl:grid-cols-[0.9fr,1.1fr]">
          <div className="space-y-5">
            <div className={`rounded-2xl p-5 ${isDark ? "bg-white/[0.03]" : "bg-slate-50"}`}>
              <div className={`text-xs font-black uppercase tracking-[0.2em] ${isDark ? "text-slate-500" : "text-slate-400"}`}>Selected Doctor</div>
              <div className="mt-3 text-xl font-black">{selectedDoctor?.full_name || "Choose a doctor"}</div>
              <div className={`mt-1 ${isDark ? "text-cyan-300" : "text-blue-700"}`}>{selectedDoctor?.specialization || "Specialization pending"}</div>
              <div className={`mt-3 text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                {[selectedDoctor?.hospital, selectedDoctor?.location].filter(Boolean).join(" • ") || "Hospital/location will appear here."}
              </div>
            </div>

            {sameDoctorActiveCase ? (
              <div className={`rounded-2xl px-4 py-4 text-sm ${isDark ? "bg-amber-500/10 text-amber-200" : "bg-amber-50 text-amber-800"}`}>
                You already have an active consultation with {selectedDoctor?.full_name || "this doctor"}. Please wait until that case is closed before creating another request with the same doctor.
              </div>
            ) : activeCases.length ? (
              <div className={`rounded-2xl px-4 py-4 text-sm ${isDark ? "bg-emerald-500/10 text-emerald-200" : "bg-emerald-50 text-emerald-800"}`}>
                You currently have {activeCases.length} active consultation {activeCases.length > 1 ? "cases" : "case"}. You can still request a different doctor for another review.
              </div>
            ) : null}

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={onSubmit}
                disabled={requesting || !selectedDoctorId || Boolean(sameDoctorActiveCase)}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 font-bold text-white transition-colors hover:bg-blue-500 disabled:opacity-50"
              >
                {requesting ? "Sending request..." : "Send Consultation Request"}
                <ArrowRight size={16} />
              </button>
              <button
                type="button"
                onClick={onClose}
                className={`inline-flex items-center justify-center rounded-2xl px-5 py-3 font-bold transition-colors ${
                  isDark ? "bg-white/5 text-slate-200 hover:bg-white/10" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                Close
              </button>
            </div>
          </div>

          <div className="space-y-3">
            <div className={`text-xs font-black uppercase tracking-[0.2em] ${isDark ? "text-slate-500" : "text-slate-400"}`}>Available Doctors</div>
            {doctors.length ? (
              doctors.map((doctor) => (
                <DoctorOption
                  key={doctor.id}
                  doctor={doctor}
                  selected={doctor.id === selectedDoctorId}
                  onSelect={setSelectedDoctorId}
                  isDark={isDark}
                />
              ))
            ) : (
              <div className={`rounded-2xl border border-dashed px-4 py-10 text-center ${isDark ? "border-white/10 text-slate-500" : "border-slate-200 text-slate-400"}`}>
                No doctors are available right now.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default function PatientCases() {
  const { isDark } = useTheme();
  const [cases, setCases] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState("");
  const [showRequestOverlay, setShowRequestOverlay] = useState(false);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);
  const [cancellingId, setCancellingId] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadCases = async () => {
    try {
      const [data, appointmentData, doctorData] = await Promise.all([
        caseService.getCases(),
        appointmentService.getPatientAppointments(),
        getDoctorDirectory(),
      ]);
      setCases(data || []);
      setAppointments(appointmentData || []);
      setDoctors(doctorData || []);
      if (!selectedDoctorId && doctorData?.length) {
        setSelectedDoctorId(doctorData[0].id);
      }
      setError("");
    } catch (loadError) {
      setError(loadError.message || "Failed to load your cases.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCases();
  }, []);

  const activeCases = useMemo(
    () => cases.filter((item) => item.status === "pending" || item.status === "open" || item.status === "in_review"),
    [cases]
  );

  const activeCaseAppointments = useMemo(
    () =>
      activeCases.length
        ? appointments
            .filter((item) => activeCases.some((caseItem) => caseItem.id === item.case_id))
            .sort((a, b) => new Date(a.date_time) - new Date(b.date_time))
        : [],
    [appointments, activeCases]
  );

  const selectedDoctor = useMemo(
    () => doctors.find((doctor) => doctor.id === selectedDoctorId) || null,
    [doctors, selectedDoctorId]
  );

  const sameDoctorActiveCase = useMemo(
    () =>
      activeCases.find(
        (item) =>
          item.doctor_id === selectedDoctorId &&
          (item.status === "pending" || item.status === "open" || item.status === "in_review")
      ) || null,
    [activeCases, selectedDoctorId]
  );

  const handleRequestConsultation = async () => {
    if (!selectedDoctorId) {
      setError("Please select a doctor before sending the consultation request.");
      return;
    }
    if (sameDoctorActiveCase) {
      setError("You already have an active consultation with this doctor. Please wait until it is closed.");
      return;
    }
    setRequesting(true);
    setError("");
    setMessage("");
    try {
      await caseService.requestConsultation({
        type: "consultation_request",
        doctor_id: selectedDoctorId,
        title: `Consultation Request for ${selectedDoctor?.specialization || "Doctor Review"}`,
        description: `Patient requested a consultation with ${selectedDoctor?.full_name || "the selected doctor"}.`,
      });
      await loadCases();
      setShowRequestOverlay(false);
      setMessage(`Consultation request sent to ${selectedDoctor?.full_name || "the selected doctor"}.`);
    } catch (requestError) {
      setError(requestError.message || "Failed to request consultation.");
    } finally {
      setRequesting(false);
    }
  };

  const handleCancelConsultation = async (caseId) => {
    setCancellingId(caseId);
    setError("");
    setMessage("");
    try {
      await caseService.cancelConsultation(caseId);
      await loadCases();
      setMessage("Consultation request cancelled successfully.");
    } catch (cancelError) {
      setError(cancelError.message || "Failed to cancel consultation request.");
    } finally {
      setCancellingId("");
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
    <div className="mx-auto max-w-6xl space-y-6 px-4 md:px-0">
      <section className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className={`text-4xl font-black tracking-tight ${isDark ? "text-white" : "text-slate-900"}`}>Consultation Cases</h1>
          <p className={`mt-2 text-lg ${isDark ? "text-slate-400" : "text-slate-500"}`}>
            Track your requests, appointments, and live consultations in one place.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            to="/patient/cases/insights"
            className={`inline-flex items-center gap-2 rounded-2xl px-4 py-3 font-bold transition-colors ${
              isDark ? "bg-white/5 text-slate-200 hover:bg-white/10" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            <Stethoscope size={16} />
            Insights
          </Link>
          <button
            type="button"
            onClick={() => setShowRequestOverlay(true)}
            className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 font-bold text-white transition-colors hover:bg-blue-500"
          >
            <ClipboardPlus size={16} />
            New Consultation Request
          </button>
          <button
            type="button"
            onClick={loadCases}
            className={`inline-flex items-center gap-2 rounded-2xl px-4 py-3 font-bold transition-colors ${
              isDark ? "bg-white/5 text-slate-200 hover:bg-white/10" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            <RefreshCcw size={16} />
            Refresh
          </button>
        </div>
      </section>

      {message ? (
        <div className={`rounded-2xl px-4 py-3 text-sm font-semibold ${isDark ? "bg-emerald-500/10 text-emerald-300" : "bg-emerald-50 text-emerald-700"}`}>
          {message}
        </div>
      ) : null}
      {error ? (
        <div className={`rounded-2xl px-4 py-3 text-sm font-semibold ${isDark ? "bg-red-500/10 text-red-300" : "bg-red-50 text-red-700"}`}>
          {error}
        </div>
      ) : null}

      {activeCases.length ? (
        <section className={`rounded-[2rem] border p-8 ${isDark ? "border-white/10 bg-slate-900" : "border-slate-100 bg-white shadow-lg shadow-slate-100/50"}`}>
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className={`text-2xl font-black ${isDark ? "text-white" : "text-slate-900"}`}>Active consultations</h2>
              <p className={`mt-2 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                Pending requests can be cancelled by you. Once a doctor accepts a request, only the doctor can close that case.
              </p>
            </div>
            <Link
              to="/patient/chat"
              className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 font-bold text-white transition-colors hover:bg-emerald-500"
            >
              <MessageSquareHeart size={16} />
              Open Consultation Chat
            </Link>
          </div>

          <div className="mt-6 space-y-4">
            {activeCases.map((item) => (
              <div key={item.id} className={`rounded-2xl border p-5 ${isDark ? "border-white/10 bg-white/[0.03]" : "border-slate-200 bg-slate-50"}`}>
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="space-y-2">
                    <div className={`inline-flex rounded-full px-3 py-1 text-xs font-black uppercase tracking-[0.18em] ${statusTone(item.status, isDark)}`}>
                      {item.status}
                    </div>
                    <h3 className={`text-xl font-black ${isDark ? "text-white" : "text-slate-900"}`}>{item.title}</h3>
                    <p className={`${isDark ? "text-slate-300" : "text-slate-600"}`}>{item.description || "Waiting for doctor review."}</p>
                    <div className={`text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                      Doctor: <span className="font-bold">{item.doctor?.full_name || "Assignment pending"}</span> • Opened {formatDate(item.created_at)}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <Link
                      to="/patient/chat"
                      className={`inline-flex items-center gap-2 rounded-2xl px-5 py-3 font-bold ${isDark ? "bg-white/5 text-slate-100 hover:bg-white/10" : "bg-white text-slate-700 hover:bg-slate-200"}`}
                    >
                      <MessageSquareHeart size={16} />
                      Open Chat
                    </Link>
                    {item.status === "pending" ? (
                      <button
                        type="button"
                        onClick={() => handleCancelConsultation(item.id)}
                        disabled={cancellingId === item.id}
                        className={`inline-flex items-center gap-2 rounded-2xl px-5 py-3 font-bold transition-colors ${
                          isDark ? "bg-red-500/10 text-red-300 hover:bg-red-500/15" : "bg-red-50 text-red-700 hover:bg-red-100"
                        }`}
                      >
                        <ShieldX size={16} />
                        {cancellingId === item.id ? "Cancelling..." : "Cancel Request"}
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className={`rounded-[2rem] border p-6 ${isDark ? "border-white/10 bg-slate-900" : "border-slate-100 bg-white shadow-lg shadow-slate-100/50"}`}>
        <h2 className={`text-2xl font-black ${isDark ? "text-white" : "text-slate-900"}`}>Appointments</h2>
        <div className="mt-5 space-y-3">
          {activeCases.length ? (
            activeCaseAppointments.length ? (
              activeCaseAppointments.map((appointment) => (
                <div key={appointment.id} className={`rounded-2xl px-4 py-4 ${isDark ? "bg-white/5" : "bg-slate-50"}`}>
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                      <div className={`font-bold ${isDark ? "text-white" : "text-slate-900"}`}>{appointment.title}</div>
                      <div className={`text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                        {formatDate(appointment.date_time)} •{" "}
                        {new Date(appointment.date_time).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                      </div>
                      <div className={`mt-1 text-sm ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                        {appointment.doctor_name || "Assigned doctor pending"} {appointment.location ? `• ${appointment.location}` : ""}
                      </div>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold ${
                        appointment.status === "completed"
                          ? "bg-emerald-500/10 text-emerald-500"
                          : appointment.status === "cancelled"
                            ? "bg-red-500/10 text-red-500"
                            : "bg-amber-500/10 text-amber-500"
                      }`}
                    >
                      {appointment.status}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className={`rounded-2xl border border-dashed px-4 py-8 text-center ${isDark ? "border-white/10 text-slate-500" : "border-slate-200 text-slate-400"}`}>
                No appointments scheduled for the active case yet.
              </div>
            )
          ) : (
            <div className={`rounded-2xl border border-dashed px-4 py-8 text-center ${isDark ? "border-white/10 text-slate-500" : "border-slate-200 text-slate-400"}`}>
              Appointments will appear here after one of your consultation requests is accepted and a doctor schedules a visit.
            </div>
          )}
        </div>
      </section>

      <section className={`rounded-[2rem] border p-6 ${isDark ? "border-white/10 bg-slate-900" : "border-slate-100 bg-white shadow-lg shadow-slate-100/50"}`}>
        <h2 className={`text-2xl font-black ${isDark ? "text-white" : "text-slate-900"}`}>Case History</h2>
        <div className="mt-5 space-y-3">
          {cases.length ? (
            cases.map((item) => (
              <div key={item.id} className={`rounded-2xl px-4 py-4 ${isDark ? "bg-white/5" : "bg-slate-50"}`}>
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className={`font-bold ${isDark ? "text-white" : "text-slate-900"}`}>{item.title}</div>
                    <div className={`mt-1 text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                      {formatDate(item.created_at)} • <span className="capitalize">{item.status}</span> • {item.doctor?.full_name || "Doctor pending"}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {item.status === "pending" ? (
                      <button
                        type="button"
                        onClick={() => handleCancelConsultation(item.id)}
                        disabled={cancellingId === item.id}
                        className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold ${
                          isDark ? "bg-red-500/10 text-red-300 hover:bg-red-500/15" : "bg-red-50 text-red-700 hover:bg-red-100"
                        }`}
                      >
                        <ShieldX size={14} />
                        Cancel
                      </button>
                    ) : null}
                    <Link
                      to="/patient/chat"
                      className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold ${
                        isDark ? "bg-white/5 text-slate-200 hover:bg-white/10" : "bg-white text-slate-700 hover:bg-slate-200"
                      }`}
                    >
                      <Stethoscope size={14} />
                      Open Chat
                    </Link>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className={`rounded-2xl border border-dashed px-4 py-8 text-center ${isDark ? "border-white/10 text-slate-500" : "border-slate-200 text-slate-400"}`}>
              No consultation cases yet.
            </div>
          )}
        </div>
      </section>

      {showRequestOverlay ? (
        <RequestConsultationOverlay
          doctors={doctors}
          selectedDoctor={selectedDoctor}
          selectedDoctorId={selectedDoctorId}
          setSelectedDoctorId={setSelectedDoctorId}
          activeCases={activeCases}
          sameDoctorActiveCase={sameDoctorActiveCase}
          requesting={requesting}
          onClose={() => setShowRequestOverlay(false)}
          onSubmit={handleRequestConsultation}
          isDark={isDark}
        />
      ) : null}
    </div>
  );
}

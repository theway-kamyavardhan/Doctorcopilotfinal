import React, { useEffect, useMemo, useState } from "react";
import { CalendarRange, ChevronLeft, ChevronRight, Clock3, LoaderCircle, MapPin, PlusCircle, UserRound } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { useTheme } from "../../context/ThemeContext";
import appointmentService from "../../services/appointment.service";
import { getDoctorCases } from "../../services/doctor.service";

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function getMonthStart(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function getMonthGrid(baseDate) {
  const start = getMonthStart(baseDate);
  const startDay = start.getDay();
  const daysInMonth = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 0).getDate();
  const cells = [];

  for (let i = 0; i < startDay; i += 1) cells.push(null);
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(new Date(baseDate.getFullYear(), baseDate.getMonth(), day));
  }
  while (cells.length % 7 !== 0) cells.push(null);

  return cells;
}

function getDateKey(value) {
  return new Date(value).toISOString().slice(0, 10);
}

function formatDateTime(value) {
  return new Date(value).toLocaleString();
}

function combineDateAndTime(dateKey, timeValue) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const [hours, minutes] = timeValue.split(":").map(Number);
  return new Date(year, month - 1, day, hours, minutes).toISOString();
}

export default function DoctorCalendar() {
  const { isDark } = useTheme();
  const [searchParams] = useSearchParams();
  const caseFromQuery = searchParams.get("case");
  const [appointments, setAppointments] = useState([]);
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [visibleMonth, setVisibleMonth] = useState(() => new Date());
  const [selectedDateKey, setSelectedDateKey] = useState(() => new Date().toISOString().slice(0, 10));
  const [selectedCaseId, setSelectedCaseId] = useState(caseFromQuery || "");
  const [title, setTitle] = useState("Follow-up Consultation");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [timeValue, setTimeValue] = useState("17:00");

  const loadCalendar = async () => {
    try {
      const [appointmentData, caseData] = await Promise.all([
        appointmentService.getDoctorAppointments(),
        getDoctorCases(),
      ]);
      setAppointments(appointmentData || []);
      const activeCases = (caseData || []).filter((item) => item.status === "open" || item.status === "in_review");
      setCases(activeCases);
      if (!selectedCaseId && activeCases.length) {
        setSelectedCaseId(caseFromQuery || activeCases[0].id);
      }
      setError("");
    } catch (loadError) {
      setError(loadError.message || "Failed to load doctor calendar.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCalendar();
  }, []);

  useEffect(() => {
    if (caseFromQuery) {
      setSelectedCaseId(caseFromQuery);
    }
  }, [caseFromQuery]);

  const appointmentMap = useMemo(() => {
    const map = new Map();
    appointments.forEach((appointment) => {
      const key = getDateKey(appointment.date_time);
      const items = map.get(key) || [];
      items.push(appointment);
      map.set(key, items);
    });
    return map;
  }, [appointments]);

  const monthCells = useMemo(() => getMonthGrid(visibleMonth), [visibleMonth]);
  const selectedAppointments = useMemo(() => appointmentMap.get(selectedDateKey) || [], [appointmentMap, selectedDateKey]);
  const selectedCase = useMemo(() => cases.find((item) => item.id === selectedCaseId) || null, [cases, selectedCaseId]);

  const handleCreateAppointment = async (event) => {
    event.preventDefault();
    if (!selectedCaseId || !selectedDateKey || !timeValue) return;
    setSaving(true);
    setSuccess("");
    setError("");
    try {
      await appointmentService.createAppointment({
        patient_id: selectedCase.patient.id,
        case_id: selectedCase.id,
        title: title.trim() || "Consultation Appointment",
        description: description.trim() || "Scheduled consultation follow-up.",
        location: location.trim() || selectedCase.doctor?.hospital || "",
        date_time: combineDateAndTime(selectedDateKey, timeValue),
      });
      setSuccess("Appointment scheduled successfully.");
      await loadCalendar();
    } catch (saveError) {
      setError(saveError.message || "Failed to create appointment.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <LoaderCircle size={28} className="animate-spin text-cyan-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <div className={`text-[11px] font-black uppercase tracking-[0.24em] ${isDark ? "text-cyan-200/75" : "text-blue-700/75"}`}>
          Calendar
        </div>
        <h2 className="mt-2 text-3xl font-bold tracking-tight">Doctor Schedule</h2>
        <p className={`mt-2 text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>
          Click a date, choose an accepted case, and schedule the next patient appointment directly from the doctor workspace.
        </p>
      </div>

      {error ? (
        <div className={`rounded-2xl px-4 py-3 text-sm font-semibold ${isDark ? "bg-red-500/10 text-red-300" : "bg-red-50 text-red-700"}`}>
          {error}
        </div>
      ) : null}

      {success ? (
        <div className={`rounded-2xl px-4 py-3 text-sm font-semibold ${isDark ? "bg-emerald-500/10 text-emerald-300" : "bg-emerald-50 text-emerald-700"}`}>
          {success}
        </div>
      ) : null}

      <div className="grid grid-cols-1 xl:grid-cols-[1.05fr_0.95fr] gap-6">
        <section className={`rounded-[1.8rem] border p-6 ${isDark ? "border-white/10 bg-white/[0.03]" : "border-slate-200 bg-slate-50/80"}`}>
          <div className="flex items-center justify-between mb-6">
            <button
              type="button"
              onClick={() => setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))}
              className={`rounded-2xl p-3 ${isDark ? "bg-white/5 text-slate-200 hover:bg-white/10" : "bg-white text-slate-700 hover:bg-slate-200"}`}
            >
              <ChevronLeft size={18} />
            </button>
            <div className="text-center">
              <div className={`text-xs font-black uppercase tracking-[0.24em] ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                Appointment Calendar
              </div>
              <div className={`mt-1 text-2xl font-black ${isDark ? "text-white" : "text-slate-900"}`}>
                {visibleMonth.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))}
              className={`rounded-2xl p-3 ${isDark ? "bg-white/5 text-slate-200 hover:bg-white/10" : "bg-white text-slate-700 hover:bg-slate-200"}`}
            >
              <ChevronRight size={18} />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-2">
            {WEEKDAY_LABELS.map((label) => (
              <div key={label} className={`px-2 py-2 text-center text-xs font-black uppercase tracking-[0.22em] ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                {label}
              </div>
            ))}

            {monthCells.map((date, index) => {
              if (!date) {
                return <div key={`empty-${index}`} className="h-20 rounded-2xl" />;
              }
              const key = getDateKey(date);
              const hasAppointments = appointmentMap.has(key);
              const isSelected = selectedDateKey === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelectedDateKey(key)}
                  className={`h-20 rounded-2xl border p-3 text-left transition-colors ${
                    isSelected
                      ? isDark
                        ? "border-cyan-400/40 bg-cyan-500/10 text-white"
                        : "border-blue-300 bg-blue-50 text-slate-900"
                      : isDark
                        ? "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold">{date.getDate()}</span>
                    {hasAppointments ? <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" /> : null}
                  </div>
                  <div className={`mt-3 text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                    {hasAppointments ? `${appointmentMap.get(key).length} booked` : ""}
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <section className={`rounded-[1.8rem] border p-6 ${isDark ? "border-white/10 bg-white/[0.03]" : "border-slate-200 bg-slate-50/80"}`}>
          <div className="flex items-center gap-3">
            <div className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl ${isDark ? "bg-cyan-400/10 text-cyan-300" : "bg-blue-100 text-blue-700"}`}>
              <CalendarRange size={20} />
            </div>
            <div>
              <div className="text-xl font-black">Schedule Appointment</div>
              <div className={`text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                {new Date(selectedDateKey).toLocaleDateString()} • choose an accepted patient case
              </div>
            </div>
          </div>

          <form onSubmit={handleCreateAppointment} className="mt-5 space-y-4">
            <div>
              <label className={`text-xs font-black uppercase tracking-[0.18em] ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                Accepted Case
              </label>
              <div className="mt-2 space-y-2">
                {cases.length ? cases.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedCaseId(item.id)}
                    className={`w-full rounded-2xl border p-4 text-left transition-all ${
                      selectedCaseId === item.id
                        ? isDark
                          ? "border-cyan-500/40 bg-slate-900"
                          : "border-cyan-300 bg-cyan-50"
                        : isDark
                          ? "border-white/10 bg-slate-950 hover:bg-slate-900"
                          : "border-slate-200 bg-white hover:bg-slate-50"
                    }`}
                  >
                    <div className="font-bold">{item.patient?.full_name || item.patient_name}</div>
                    <div className={`mt-1 text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                      {item.title} • {item.patient?.patient_id || "Case"}
                    </div>
                  </button>
                )) : (
                  <div className={`rounded-2xl border border-dashed px-4 py-10 text-center text-sm ${isDark ? "border-white/10 text-slate-500" : "border-slate-200 text-slate-400"}`}>
                    No accepted cases available yet.
                  </div>
                )}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className={`text-xs font-black uppercase tracking-[0.18em] ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                  Title
                </label>
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  className={`mt-2 w-full rounded-2xl border px-4 py-3 text-sm outline-none ${isDark ? "border-white/10 bg-slate-950 text-white" : "border-slate-200 bg-white text-slate-900"}`}
                />
              </div>
              <div>
                <label className={`text-xs font-black uppercase tracking-[0.18em] ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                  Time
                </label>
                <input
                  type="time"
                  value={timeValue}
                  onChange={(event) => setTimeValue(event.target.value)}
                  className={`mt-2 w-full rounded-2xl border px-4 py-3 text-sm outline-none ${isDark ? "border-white/10 bg-slate-950 text-white" : "border-slate-200 bg-white text-slate-900"}`}
                />
              </div>
            </div>

            <div>
              <label className={`text-xs font-black uppercase tracking-[0.18em] ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                Description
              </label>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={3}
                className={`mt-2 w-full rounded-2xl border px-4 py-3 text-sm outline-none ${isDark ? "border-white/10 bg-slate-950 text-white" : "border-slate-200 bg-white text-slate-900"}`}
                placeholder="Add any preparation or follow-up note for the patient."
              />
            </div>

            <div>
              <label className={`text-xs font-black uppercase tracking-[0.18em] ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                Location
              </label>
              <input
                value={location}
                onChange={(event) => setLocation(event.target.value)}
                className={`mt-2 w-full rounded-2xl border px-4 py-3 text-sm outline-none ${isDark ? "border-white/10 bg-slate-950 text-white" : "border-slate-200 bg-white text-slate-900"}`}
                placeholder="Hospital or clinic location"
              />
            </div>

            <button
              type="submit"
              disabled={!selectedCase || saving}
              className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 font-bold text-white transition-colors hover:bg-blue-500 disabled:opacity-60"
            >
              {saving ? <LoaderCircle size={16} className="animate-spin" /> : <PlusCircle size={16} />}
              {saving ? "Booking..." : "Book Appointment"}
            </button>
          </form>

          <div className="mt-8">
            <div className="text-lg font-black">Appointments on {new Date(selectedDateKey).toLocaleDateString()}</div>
            <div className="mt-4 space-y-3">
              {selectedAppointments.length ? selectedAppointments.map((appointment) => (
                <div key={appointment.id} className={`rounded-2xl px-4 py-4 ${isDark ? "bg-slate-950" : "bg-white"}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-bold">{appointment.title}</div>
                      <div className={`mt-1 text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                        {appointment.description || "Consultation appointment"}
                      </div>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-bold ${
                      appointment.status === "completed"
                        ? "bg-emerald-500/10 text-emerald-500"
                        : appointment.status === "cancelled"
                          ? "bg-red-500/10 text-red-500"
                          : "bg-amber-500/10 text-amber-500"
                    }`}>
                      {appointment.status}
                    </span>
                  </div>
                  <div className={`mt-3 space-y-2 text-sm ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                    <div className="flex items-center gap-2">
                      <UserRound size={14} />
                      {appointment.patient_name || "Patient"}
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock3 size={14} />
                      {formatDateTime(appointment.date_time)}
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin size={14} />
                      {appointment.location || "Location pending"}
                    </div>
                  </div>
                </div>
              )) : (
                <div className={`rounded-2xl px-4 py-4 text-sm ${isDark ? "bg-slate-950 text-slate-400" : "bg-white text-slate-500"}`}>
                  No appointments scheduled on this date.
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

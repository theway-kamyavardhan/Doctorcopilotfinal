import React, { useEffect, useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, Clock3, LoaderCircle, MapPin, UserRound } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";
import appointmentService from "../../services/appointment.service";

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function getMonthStart(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function getMonthGrid(baseDate) {
  const start = getMonthStart(baseDate);
  const startDay = start.getDay();
  const daysInMonth = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 0).getDate();
  const cells = [];

  for (let i = 0; i < startDay; i += 1) {
    cells.push(null);
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(new Date(baseDate.getFullYear(), baseDate.getMonth(), day));
  }

  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  return cells;
}

function getDateKey(value) {
  return new Date(value).toISOString().slice(0, 10);
}

function formatDateTime(value) {
  return new Date(value).toLocaleString();
}

export default function Calendar() {
  const { isDark } = useTheme();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [visibleMonth, setVisibleMonth] = useState(() => new Date());
  const [selectedDateKey, setSelectedDateKey] = useState(null);

  useEffect(() => {
    const loadAppointments = async () => {
      try {
        const data = await appointmentService.getPatientAppointments();
        setAppointments(data || []);
        if (data?.length) {
          setSelectedDateKey(getDateKey(data[0].date_time));
        }
      } catch (loadError) {
        setError(loadError.message || "Failed to load appointments.");
      } finally {
        setLoading(false);
      }
    };

    loadAppointments();
  }, []);

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

  const selectedAppointments = useMemo(() => {
    if (!selectedDateKey) return [];
    return appointmentMap.get(selectedDateKey) || [];
  }, [appointmentMap, selectedDateKey]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <LoaderCircle size={28} className="animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 px-4 md:px-0">
      <section>
        <h1 className={`text-4xl font-black tracking-tight ${isDark ? "text-white" : "text-slate-900"}`}>Appointment Calendar</h1>
        <p className={`mt-2 text-lg ${isDark ? "text-slate-400" : "text-slate-500"}`}>
          Track scheduled consultation appointments across your case history.
        </p>
      </section>

      {error ? (
        <div className={`rounded-2xl px-4 py-3 text-sm font-semibold ${isDark ? "bg-red-500/10 text-red-300" : "bg-red-50 text-red-700"}`}>
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-1 xl:grid-cols-[1.15fr_0.85fr] gap-6">
        <section className={`rounded-2xl border p-6 ${isDark ? "bg-slate-950 border-white/10" : "bg-white border-slate-100 shadow-lg shadow-slate-100/50"}`}>
          <div className="flex items-center justify-between mb-6">
            <button
              type="button"
              onClick={() => setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))}
              className={`rounded-2xl p-3 ${isDark ? "bg-white/5 text-slate-200 hover:bg-white/10" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}
            >
              <ChevronLeft size={18} />
            </button>
            <div className="text-center">
              <div className={`text-xs font-black uppercase tracking-[0.24em] ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                Calendar
              </div>
              <div className={`mt-1 text-2xl font-black ${isDark ? "text-white" : "text-slate-900"}`}>
                {visibleMonth.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))}
              className={`rounded-2xl p-3 ${isDark ? "bg-white/5 text-slate-200 hover:bg-white/10" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}
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
                        : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold">{date.getDate()}</span>
                    {hasAppointments ? <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" /> : null}
                  </div>
                  <div className={`mt-3 text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                    {hasAppointments ? `${appointmentMap.get(key).length} appointment${appointmentMap.get(key).length > 1 ? "s" : ""}` : ""}
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <section className={`rounded-2xl border p-6 ${isDark ? "bg-slate-950 border-white/10" : "bg-white border-slate-100 shadow-lg shadow-slate-100/50"}`}>
          <div className="flex items-center gap-3 mb-5">
            <div className={`rounded-2xl p-3 ${isDark ? "bg-blue-500/10 text-blue-300" : "bg-blue-50 text-blue-700"}`}>
              <CalendarDays size={18} />
            </div>
            <div>
              <h2 className={`text-xl font-black ${isDark ? "text-white" : "text-slate-900"}`}>Appointment Details</h2>
              <p className={`text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                {selectedDateKey ? new Date(selectedDateKey).toLocaleDateString() : "Select a date"}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {selectedAppointments.length ? (
              selectedAppointments.map((appointment) => (
                <div key={appointment.id} className={`rounded-2xl p-4 ${isDark ? "bg-white/5" : "bg-slate-50"}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className={`font-bold ${isDark ? "text-white" : "text-slate-900"}`}>{appointment.title}</div>
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

                  <div className={`mt-4 space-y-2 text-sm ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                    <div className="flex items-center gap-2">
                      <UserRound size={14} />
                      {appointment.doctor_name || "Assigned doctor pending"}
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock3 size={14} />
                      {formatDateTime(appointment.date_time)}
                    </div>
                    {(appointment.location || appointment.doctor_specialization) ? (
                      <div className="flex items-center gap-2">
                        <MapPin size={14} />
                        {appointment.location || appointment.doctor_specialization}
                      </div>
                    ) : null}
                  </div>
                </div>
              ))
            ) : (
              <div className={`rounded-2xl p-4 text-sm ${isDark ? "bg-white/5 text-slate-400" : "bg-slate-50 text-slate-500"}`}>
                No appointments on the selected day.
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

import React from "react";
import { CalendarClock, ClipboardList } from "lucide-react";

function StateMetric({ label, value, isDark }) {
  return (
    <div className={`rounded-[1.4rem] px-4 py-4 ${isDark ? "bg-slate-900" : "bg-slate-50"}`}>
      <div
        className={`text-[11px] font-black uppercase tracking-[0.24em] ${
          isDark ? "text-slate-500" : "text-slate-400"
        }`}
      >
        {label}
      </div>
      <div className={`mt-2 text-3xl font-black ${isDark ? "text-white" : "text-slate-900"}`}>{value}</div>
    </div>
  );
}

export default function SystemOverview({
  reportsCount = 0,
  abnormalCount = 0,
  conditionsCount = 0,
  categoryCount = 0,
  upcomingAppointments = [],
  activeCase = null,
  isDark,
}) {
  const nextAppointment = upcomingAppointments[0] || null;

  return (
    <aside
      className={`rounded-[2rem] px-6 py-6 ${
        isDark
          ? "bg-slate-950 text-white shadow-[0_28px_80px_rgba(2,6,23,0.45)]"
          : "bg-white text-slate-900 shadow-[0_24px_80px_rgba(15,23,42,0.08)]"
      }`}
    >
      <div className="space-y-8">
        <div>
          <div
            className={`text-[11px] font-black uppercase tracking-[0.3em] ${
              isDark ? "text-slate-500" : "text-slate-400"
            }`}
          >
            System Overview
          </div>
          <p className={`mt-2 text-sm leading-6 ${isDark ? "text-slate-300" : "text-slate-600"}`}>
            Your health engine's current state and the care activity connected to it.
          </p>
        </div>

        <div className="space-y-4">
          <div
            className={`text-[11px] font-black uppercase tracking-[0.24em] ${
              isDark ? "text-slate-500" : "text-slate-400"
            }`}
          >
            System State
          </div>
          <div className="grid grid-cols-2 gap-4">
            <StateMetric label="Reports" value={reportsCount} isDark={isDark} />
            <StateMetric label="Categories" value={categoryCount} isDark={isDark} />
            <StateMetric label="Abnormal" value={abnormalCount} isDark={isDark} />
            <StateMetric label="Conditions" value={conditionsCount} isDark={isDark} />
          </div>
        </div>

        <div className="space-y-4">
          <div
            className={`text-[11px] font-black uppercase tracking-[0.24em] ${
              isDark ? "text-slate-500" : "text-slate-400"
            }`}
          >
            Care Status
          </div>

          <div className={`rounded-[1.6rem] px-5 py-5 ${isDark ? "bg-slate-900" : "bg-slate-50"}`}>
            <div className="flex items-start gap-3">
              <div
                className={`rounded-2xl p-3 ${isDark ? "bg-slate-800 text-slate-200" : "bg-white text-slate-700"}`}
              >
                <ClipboardList size={18} />
              </div>
              <div className="min-w-0">
                <div
                  className={`text-[11px] font-black uppercase tracking-[0.24em] ${
                    isDark ? "text-slate-500" : "text-slate-400"
                  }`}
                >
                  Consultation
                </div>
                <div className={`mt-1 text-base font-bold capitalize ${isDark ? "text-white" : "text-slate-900"}`}>
                  {activeCase ? activeCase.status.replaceAll("_", " ") : "No active case"}
                </div>
                <div className={`mt-2 text-sm leading-6 ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                  {activeCase
                    ? activeCase.title
                    : "Consultation can be requested whenever you want a doctor-led review."}
                </div>
              </div>
            </div>
          </div>

          <div className={`rounded-[1.6rem] px-5 py-5 ${isDark ? "bg-slate-900" : "bg-slate-50"}`}>
            <div className="flex items-start gap-3">
              <div
                className={`rounded-2xl p-3 ${isDark ? "bg-slate-800 text-slate-200" : "bg-white text-slate-700"}`}
              >
                <CalendarClock size={18} />
              </div>
              <div className="min-w-0">
                <div
                  className={`text-[11px] font-black uppercase tracking-[0.24em] ${
                    isDark ? "text-slate-500" : "text-slate-400"
                  }`}
                >
                  Appointment Flow
                </div>
                <div className={`mt-1 text-base font-bold ${isDark ? "text-white" : "text-slate-900"}`}>
                  {nextAppointment ? nextAppointment.doctor_name || "Assigned doctor pending" : "No appointment yet"}
                </div>
                <div className={`mt-2 text-sm leading-6 ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                  {nextAppointment
                    ? new Date(nextAppointment.date_time).toLocaleString([], {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })
                    : "Scheduled visits will appear here once a doctor creates the next appointment."}
                </div>
              </div>
            </div>
          </div>

          <p className={`px-1 text-sm leading-6 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
            Every shift in care status is reflected alongside the report timeline ribbon, so the story
            of your health and the state of your care stay in sync.
          </p>
        </div>
      </div>
    </aside>
  );
}

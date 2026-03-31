import React from "react";
import { CalendarClock, ClipboardList } from "lucide-react";

function Metric({ label, value, isDark }) {
  return (
    <div className="space-y-1">
      <div
        className={`text-[11px] font-black uppercase tracking-[0.24em] ${
          isDark ? "text-slate-400" : "text-slate-500"
        }`}
      >
        {label}
      </div>
      <div className={`text-3xl font-black tracking-tight ${isDark ? "text-white" : "text-slate-950"}`}>{value}</div>
    </div>
  );
}

function formatAppointment(dateTime) {
  if (!dateTime) return "None";
  return new Date(dateTime).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function SystemPanel({
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
      className={`relative overflow-hidden rounded-[2.2rem] border px-6 py-6 ${
        isDark
          ? "border-white/8 bg-slate-900/55 text-white shadow-[0_28px_80px_rgba(2,6,23,0.5)]"
          : "border-white/70 bg-white/60 text-slate-900 shadow-[0_24px_70px_rgba(15,23,42,0.1)]"
      } backdrop-blur-2xl`}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,_rgba(56,189,248,0.16),_transparent_32%)]" />

      <div className="relative space-y-8">
        <div>
          <div
            className={`text-[11px] font-black uppercase tracking-[0.3em] ${
              isDark ? "text-slate-400" : "text-slate-500"
            }`}
          >
            System Overview
          </div>
          <p className={`mt-2 text-sm leading-6 ${isDark ? "text-slate-300" : "text-slate-600"}`}>
            A compact readout of platform state and active care activity, linked directly to your timeline.
          </p>
        </div>

        <div className="space-y-5">
          <div
            className={`text-[11px] font-black uppercase tracking-[0.24em] ${
              isDark ? "text-slate-400" : "text-slate-500"
            }`}
          >
            System State
          </div>
          <div className="grid grid-cols-2 gap-x-8 gap-y-6">
            <Metric label="Reports" value={reportsCount} isDark={isDark} />
            <Metric label="Categories" value={categoryCount} isDark={isDark} />
            <Metric label="Abnormal" value={abnormalCount} isDark={isDark} />
            <Metric label="Conditions" value={conditionsCount} isDark={isDark} />
          </div>
        </div>

        <div className={`h-px ${isDark ? "bg-white/8" : "bg-slate-200/80"}`} />

        <div className="space-y-4">
          <div
            className={`text-[11px] font-black uppercase tracking-[0.24em] ${
              isDark ? "text-slate-400" : "text-slate-500"
            }`}
          >
            Care Status
          </div>

          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div
                className={`rounded-[1.1rem] p-3 ${
                  isDark ? "bg-slate-950/70 text-slate-200" : "bg-white/65 text-slate-700"
                } backdrop-blur-md`}
              >
                <ClipboardList size={18} />
              </div>
              <div className="min-w-0">
                <div className={`text-sm font-bold uppercase tracking-[0.18em] ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                  Case
                </div>
                <div className={`mt-1 text-lg font-black capitalize ${isDark ? "text-white" : "text-slate-950"}`}>
                  {activeCase ? activeCase.status.replaceAll("_", " ") : "No active case"}
                </div>
                <p className={`mt-1 text-sm leading-6 ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                  {activeCase ? activeCase.title : "No active consultation is running right now."}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div
                className={`rounded-[1.1rem] p-3 ${
                  isDark ? "bg-slate-950/70 text-slate-200" : "bg-white/65 text-slate-700"
                } backdrop-blur-md`}
              >
                <CalendarClock size={18} />
              </div>
              <div className="min-w-0">
                <div className={`text-sm font-bold uppercase tracking-[0.18em] ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                  Next Appointment
                </div>
                <div className={`mt-1 text-lg font-black ${isDark ? "text-white" : "text-slate-950"}`}>
                  {nextAppointment?.doctor_name || "None"}
                </div>
                <p className={`mt-1 text-sm leading-6 ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                  {nextAppointment
                    ? formatAppointment(nextAppointment.date_time)
                    : "Your next scheduled visit will appear here when a doctor books it."}
                </p>
              </div>
            </div>
          </div>
        </div>

        <p className={`text-sm leading-6 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
          Each system state here should feel continuous with the ribbon on the left, where the story of
          those changes becomes visible across time.
        </p>
      </div>
    </aside>
  );
}

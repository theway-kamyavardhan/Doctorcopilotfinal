import React, { useMemo } from "react";
import { motion } from "framer-motion";
import { buildClinicalInterpretation, getLatestReport } from "../../utils/patientIntelligence";

function buildHistoryFlags(reports = [], trends = null) {
  const flags = [];
  const vitaminB12Series = trends?.series?.vitamin_b12 || [];
  const persistentLowB12 =
    vitaminB12Series.length >= 2 &&
    vitaminB12Series.every((point) =>
      ["low", "deficient", "insufficient"].includes(String(point.status || "").toLowerCase())
    );

  if (persistentLowB12) {
    flags.push(`Low B12 since ${vitaminB12Series[0].date}`);
  }

  const plateletSeries = trends?.series?.platelets || [];
  const persistentPlateletIssue =
    plateletSeries.length >= 2 &&
    plateletSeries.filter((point) => String(point.status || "").toLowerCase() === "low").length >= 2;

  if (persistentPlateletIssue) {
    flags.push("Platelets have been low across multiple reports");
  }

  if (!flags.length && reports.length >= 2) {
    flags.push("Comparative trend history is active");
  }

  return flags.slice(0, 3);
}

function DetailItem({ label, value, isDark }) {
  return (
    <div>
      <div className={`text-[11px] font-black uppercase tracking-[0.24em] ${isDark ? "text-slate-500" : "text-slate-400"}`}>
        {label}
      </div>
      <div className={`mt-1 text-sm font-semibold ${isDark ? "text-slate-200" : "text-slate-700"}`}>
        {value}
      </div>
    </div>
  );
}

function formatDate(value) {
  if (!value) return "Pending";
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function PatientContextPanel({ profile, reports = [], trends = null, insights = null, isDark }) {
  const latestReport = useMemo(() => getLatestReport(reports), [reports]);
  const historyFlags = useMemo(() => buildHistoryFlags(reports, trends), [reports, trends]);
  const interpretation = useMemo(() => buildClinicalInterpretation(latestReport), [latestReport]);
  const summaryText =
    latestReport?.summary ||
    insights?.summary?.[0] ||
    "Upload additional reports to reveal stronger continuity across your medical history.";

  return (
    <section
      className={`relative overflow-hidden rounded-[2.2rem] border px-6 py-6 ${
        isDark
          ? "border-white/8 bg-slate-900/55 shadow-[0_28px_80px_rgba(2,6,23,0.5)]"
          : "border-white/70 bg-white/60 shadow-[0_24px_70px_rgba(15,23,42,0.1)]"
      } backdrop-blur-2xl`}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_left_top,_rgba(59,130,246,0.16),_transparent_38%)]" />

      <div className="relative space-y-6">
        <div>
          <div
            className={`text-[11px] font-black uppercase tracking-[0.3em] ${
              isDark ? "text-slate-500" : "text-slate-400"
            }`}
          >
            Patient Context
          </div>
          <div className={`mt-3 text-3xl font-black tracking-tight ${isDark ? "text-white" : "text-slate-950"}`}>
            {profile?.user?.full_name || "Your profile"}
          </div>
          <div className={`mt-3 flex flex-wrap gap-x-3 gap-y-2 text-sm ${isDark ? "text-slate-300" : "text-slate-600"}`}>
            <span>Age: {profile?.age || "Unknown"}</span>
            <span>{profile?.gender || "Unknown"}</span>
            <span>{profile?.blood_group || "Blood group pending"}</span>
            {profile?.phone_number ? <span>{profile.phone_number}</span> : null}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <DetailItem label="Latest Lab" value={latestReport?.lab_name || "Pending"} isDark={isDark} />
          <DetailItem label="Report Count" value={reports.length || 0} isDark={isDark} />
          <DetailItem label="Latest Date" value={formatDate(latestReport?.report_date)} isDark={isDark} />
          <DetailItem
            label="Doctor"
            value={latestReport?.metadata?.doctor?.doctor_name || "Unassigned"}
            isDark={isDark}
          />
        </div>

        <div
          className={`rounded-[1.7rem] px-5 py-5 ${
            isDark ? "bg-slate-950/55" : "bg-white/48"
          } backdrop-blur-md`}
        >
          <div
            className={`text-[11px] font-black uppercase tracking-[0.24em] ${
              isDark ? "text-slate-500" : "text-slate-400"
            }`}
          >
            Clinical Summary
          </div>
          <p className={`mt-3 text-sm leading-7 ${isDark ? "text-slate-200" : "text-slate-700"}`}>
            {summaryText}
          </p>
        </div>

        <div className="space-y-3">
          <div
            className={`text-[11px] font-black uppercase tracking-[0.24em] ${
              isDark ? "text-slate-500" : "text-slate-400"
            }`}
          >
            History Flags
          </div>
          {(historyFlags.length ? historyFlags : interpretation.slice(0, 2)).map((item, index) => (
            <motion.div
              key={`${item}-${index}`}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.35, delay: index * 0.05 }}
              className={`rounded-[1.5rem] px-4 py-3 text-sm leading-6 ${
                isDark ? "bg-cyan-500/10 text-slate-200" : "bg-cyan-50/85 text-slate-700"
              } backdrop-blur-md`}
            >
              {item}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

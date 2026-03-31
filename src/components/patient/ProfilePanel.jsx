import React from "react";

function buildHistoryFlags(reports = [], trends = null) {
  const flags = [];
  const vitaminB12Series = trends?.series?.vitamin_b12 || [];
  const persistentLowB12 = vitaminB12Series.length >= 2 && vitaminB12Series.every((point) =>
    ["low", "deficient", "insufficient"].includes(String(point.status || "").toLowerCase())
  );

  if (persistentLowB12) {
    flags.push(`Low B12 since ${vitaminB12Series[0].date}`);
  }

  const plateletSeries = trends?.series?.platelets || [];
  const persistentPlateletIssue = plateletSeries.length >= 2 && plateletSeries.filter((point) =>
    String(point.status || "").toLowerCase() === "low"
  ).length >= 2;

  if (persistentPlateletIssue) {
    flags.push("Platelets have been low across multiple reports");
  }

  if (!flags.length && reports.length >= 2) {
    flags.push("Trend history is active and comparative analysis is available");
  }

  return flags.slice(0, 3);
}

export default function ProfilePanel({ profile, reports = [], trends = null, isDark }) {
  const historyFlags = buildHistoryFlags(reports, trends);

  const items = [
    { label: "Age", value: profile?.age || "Unknown" },
    { label: "Gender", value: profile?.gender || "Unknown" },
    { label: "Blood Group", value: profile?.blood_group || "Unknown" },
    { label: "Phone", value: profile?.phone_number || "Not added" },
  ];

  return (
    <section
      className={`rounded-2xl border p-6 ${
        isDark ? "bg-slate-950 border-white/10" : "bg-white border-slate-100 shadow-lg shadow-slate-100/60"
      }`}
    >
      <div className="mb-5">
        <h2 className={`text-xl font-black ${isDark ? "text-white" : "text-slate-900"}`}>Patient Profile</h2>
        <p className={`mt-1 text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>
          Identity context and long-range pattern flags used across your timeline.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {items.map((item) => (
          <div key={item.label} className={`rounded-2xl px-4 py-4 ${isDark ? "bg-white/5" : "bg-slate-50"}`}>
            <div className={`text-xs font-black uppercase tracking-[0.22em] ${isDark ? "text-slate-500" : "text-slate-400"}`}>
              {item.label}
            </div>
            <div className={`mt-2 text-sm font-semibold ${isDark ? "text-slate-200" : "text-slate-700"}`}>
              {item.value}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-5 space-y-3">
        <div className={`text-xs font-black uppercase tracking-[0.24em] ${isDark ? "text-slate-500" : "text-slate-400"}`}>
          History Flags
        </div>
        {historyFlags.map((flag) => (
          <div key={flag} className={`rounded-2xl px-4 py-3 text-sm ${isDark ? "bg-cyan-500/10 text-slate-200" : "bg-blue-50 text-slate-700"}`}>
            {flag}
          </div>
        ))}
      </div>
    </section>
  );
}

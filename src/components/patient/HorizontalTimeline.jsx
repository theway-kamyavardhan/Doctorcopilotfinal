import React, { useEffect, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowUpRight, CalendarDays } from "lucide-react";
import { getReportPreviewInsight } from "../../utils/patientIntelligence";

function formatDate(value) {
  if (!value) return "Date pending";
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function HorizontalTimeline({ reports = [], isDark }) {
  const scrollRef = useRef(null);
  const activeRef = useRef(null);

  const orderedReports = useMemo(
    () =>
      [...reports].sort((a, b) => {
        const aDate = a?.report_date || a?.created_at || 0;
        const bDate = b?.report_date || b?.created_at || 0;
        return new Date(aDate) - new Date(bDate);
      }),
    [reports]
  );

  const activeReportId = orderedReports[orderedReports.length - 1]?.id || null;

  useEffect(() => {
    if (!activeRef.current) return;
    activeRef.current.scrollIntoView({
      behavior: "smooth",
      inline: "center",
      block: "nearest",
    });
  }, [activeReportId]);

  return (
    <section
      className={`relative overflow-hidden rounded-[2rem] px-6 py-6 ${
        isDark
          ? "bg-slate-950 text-white shadow-[0_28px_80px_rgba(2,6,23,0.45)]"
          : "bg-white text-slate-900 shadow-[0_24px_80px_rgba(15,23,42,0.08)]"
      }`}
    >
      <div
        className={`pointer-events-none absolute left-0 top-0 z-10 h-full w-14 ${
          isDark
            ? "bg-gradient-to-r from-slate-950 via-slate-950/75 to-transparent"
            : "bg-gradient-to-r from-white via-white/85 to-transparent"
        }`}
      />
      <div
        className={`pointer-events-none absolute right-0 top-0 z-10 h-full w-14 ${
          isDark
            ? "bg-gradient-to-l from-slate-950 via-slate-950/75 to-transparent"
            : "bg-gradient-to-l from-white via-white/85 to-transparent"
        }`}
      />

      <div className="relative">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className={`text-[11px] font-black uppercase tracking-[0.3em] ${isDark ? "text-slate-500" : "text-slate-400"}`}>
              Timeline Ribbon
            </div>
            <p className={`mt-2 max-w-xl text-sm leading-6 ${isDark ? "text-slate-300" : "text-slate-600"}`}>
              Scroll through your medical journey as one continuous sequence, with the newest report
              centered as the active reading.
            </p>
          </div>

          <Link
            to="/patient/timeline"
            className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold ${
              isDark ? "bg-slate-900 text-slate-200" : "bg-slate-100 text-slate-700"
            }`}
          >
            <CalendarDays size={14} />
            Open Full Timeline
          </Link>
        </div>

        <div className="relative mt-8">
          <div
            ref={scrollRef}
            className="overflow-x-auto scroll-smooth snap-x snap-mandatory pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            <div
              className="flex min-w-max gap-4"
              style={{ paddingInline: "max(1.25rem, calc(50% - 9.5rem))" }}
            >
              {orderedReports.length ? (
                orderedReports.map((report, index) => {
                  const isActive = report.id === activeReportId;

                  return (
                    <motion.div
                      key={report.id}
                      ref={isActive ? activeRef : null}
                      initial={{ opacity: 0, y: 18 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.35, delay: index * 0.04 }}
                      whileHover={{ y: -6, scale: 1.02 }}
                      className="group relative w-[304px] shrink-0 snap-center"
                    >
                      <div className="mb-4 flex items-center gap-3">
                        <div
                          className={`h-3.5 w-3.5 rounded-full ${
                            isActive
                              ? "bg-cyan-400 shadow-[0_0_26px_rgba(34,211,238,0.8)]"
                              : isDark
                                ? "bg-slate-700"
                                : "bg-slate-300"
                          }`}
                        />
                        <div className={`text-xs font-black uppercase tracking-[0.22em] ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                          {formatDate(report.report_date || report.created_at)}
                        </div>
                      </div>

                      <Link
                        to="/patient/timeline"
                        className={`block rounded-[1.75rem] px-5 py-5 transition-all duration-300 ${
                          isActive
                            ? isDark
                              ? "bg-slate-900 shadow-[0_0_0_1px_rgba(34,211,238,0.2)]"
                              : "bg-slate-50 shadow-[0_0_0_1px_rgba(14,165,233,0.15)]"
                            : isDark
                              ? "bg-slate-900/80"
                              : "bg-slate-50/70"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className={`text-[11px] font-black uppercase tracking-[0.24em] ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                              {report.report_category || "medical"}
                            </div>
                            <div className={`mt-2 text-lg font-black ${isDark ? "text-white" : "text-slate-900"}`}>
                              {report.report_type || "Medical Report"}
                            </div>
                            <div className={`mt-1 text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                              {report.lab_name || "Unknown lab"}
                            </div>
                          </div>
                          <div
                            className={`rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] ${
                              isActive
                                ? isDark
                                  ? "bg-cyan-500/12 text-cyan-200"
                                  : "bg-cyan-100 text-cyan-700"
                                : isDark
                                  ? "bg-slate-800 text-slate-400"
                                  : "bg-white text-slate-500"
                            }`}
                          >
                            {isActive ? "Active" : "Report"}
                          </div>
                        </div>

                        <div className={`mt-4 text-sm leading-6 ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                          {getReportPreviewInsight(report)}
                        </div>

                        <div
                          className={`mt-4 flex items-center gap-2 text-sm font-bold transition-opacity duration-300 ${
                            isDark ? "text-slate-200" : "text-slate-700"
                          } opacity-0 group-hover:opacity-100`}
                        >
                          Expand report
                          <ArrowUpRight size={14} />
                        </div>
                      </Link>
                    </motion.div>
                  );
                })
              ) : (
                <div className={`px-2 text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                  Timeline activity will appear after reports are uploaded.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

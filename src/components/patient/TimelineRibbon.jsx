import React, { useEffect, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowUpRight, CalendarDays } from "lucide-react";
import { getReportPreviewInsight } from "../../utils/patientIntelligence";

function formatDate(value) {
  if (!value) return "Pending";
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getYear(value) {
  if (!value) return "----";
  return new Date(value).getFullYear();
}

function buildMilestoneLabel(report, index, total) {
  if (index === 0) return "Baseline";

  const preview = String(getReportPreviewInsight(report) || "").toLowerCase();
  if (preview.includes("vitamin b12")) return "B12 deficiency";
  if (preview.includes("platelets") && preview.includes("low")) return "Platelets drop";
  if (preview.includes("platelets")) return "Platelets shift";
  if (preview.includes("vitamin d")) return "Vitamin D shift";
  if (preview.includes("hemoglobin") && preview.includes("low")) return "Hemoglobin dip";
  if (preview.includes("iron")) return "Iron pattern";
  if (index === total - 1) return "Current analysis";

  return report.report_type || "Follow-up";
}

export default function TimelineRibbon({ reports = [], isDark }) {
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
      className={`relative overflow-hidden rounded-[2.2rem] border px-6 py-6 ${
        isDark
          ? "border-white/8 bg-slate-900/55 text-white shadow-[0_28px_80px_rgba(2,6,23,0.5)]"
          : "border-white/70 bg-white/60 text-slate-900 shadow-[0_24px_70px_rgba(15,23,42,0.1)]"
      } backdrop-blur-2xl`}
    >
      <div
        className={`pointer-events-none absolute left-0 top-0 z-10 h-full w-16 ${
          isDark
            ? "bg-gradient-to-r from-slate-900/90 via-slate-900/70 to-transparent"
            : "bg-gradient-to-r from-white/90 via-white/75 to-transparent"
        }`}
      />
      <div
        className={`pointer-events-none absolute right-0 top-0 z-10 h-full w-16 ${
          isDark
            ? "bg-gradient-to-l from-slate-900/90 via-slate-900/70 to-transparent"
            : "bg-gradient-to-l from-white/90 via-white/75 to-transparent"
        }`}
      />

      <div className="relative">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div
              className={`text-[11px] font-black uppercase tracking-[0.3em] ${
                isDark ? "text-slate-400" : "text-slate-500"
              }`}
            >
              Timeline Ribbon
            </div>
            <p className={`mt-2 max-w-2xl text-sm leading-6 ${isDark ? "text-slate-300" : "text-slate-600"}`}>
              A horizontal journey of the moments that changed your health story, with the newest report
              centered as the active node.
            </p>
          </div>

          <Link
            to="/patient/timeline"
            className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold ${
              isDark ? "bg-slate-950/70 text-slate-200" : "bg-white/70 text-slate-700"
            } backdrop-blur-md`}
          >
            <CalendarDays size={14} />
            Open Full Timeline
          </Link>
        </div>

        <div className="relative mt-8">
          <div className={`pointer-events-none absolute left-8 right-8 top-8 h-px ${isDark ? "bg-white/10" : "bg-slate-200/80"}`} />

          <div className="overflow-x-auto scroll-smooth snap-x snap-mandatory pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div
              className="flex min-w-max gap-4"
              style={{ paddingInline: "max(1.5rem, calc(50% - 10.5rem))" }}
            >
              {orderedReports.length ? (
                orderedReports.map((report, index) => {
                  const isActive = report.id === activeReportId;
                  const milestone = buildMilestoneLabel(report, index, orderedReports.length);

                  return (
                    <motion.div
                      key={report.id}
                      ref={isActive ? activeRef : null}
                      initial={{ opacity: 0, y: 18 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.35, delay: index * 0.05 }}
                      whileHover={{ y: -6 }}
                      className="group relative w-[320px] shrink-0 snap-center"
                    >
                      <div className="mb-4 flex items-center gap-3">
                        <div
                          className={`h-4 w-4 rounded-full ${
                            isActive
                              ? "bg-cyan-400 shadow-[0_0_28px_rgba(34,211,238,0.8)]"
                              : isDark
                                ? "bg-slate-600"
                                : "bg-slate-300"
                          }`}
                        />
                        <div className={`text-xs font-black uppercase tracking-[0.24em] ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                          {formatDate(report.report_date || report.created_at)}
                        </div>
                      </div>

                      <Link
                        to="/patient/timeline"
                        className={`block rounded-[1.9rem] px-5 py-5 transition-all duration-300 ${
                          isActive
                            ? isDark
                              ? "bg-slate-950/78 shadow-[0_22px_60px_rgba(14,165,233,0.16)]"
                              : "bg-white/82 shadow-[0_20px_55px_rgba(14,165,233,0.12)]"
                            : isDark
                              ? "bg-slate-950/55"
                              : "bg-white/55"
                        } backdrop-blur-xl`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className={`text-3xl font-black tracking-tight ${isDark ? "text-white" : "text-slate-950"}`}>
                              {getYear(report.report_date || report.created_at)}
                            </div>
                            <div className={`mt-2 text-base font-bold ${isDark ? "text-slate-100" : "text-slate-800"}`}>
                              {milestone}
                            </div>
                            <div className={`mt-1 text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                              {report.lab_name || report.report_type || "Medical report"}
                            </div>
                          </div>

                          <div
                            className={`rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] ${
                              isActive
                                ? isDark
                                  ? "bg-cyan-500/14 text-cyan-100"
                                  : "bg-cyan-100/90 text-cyan-700"
                                : isDark
                                  ? "bg-slate-800 text-slate-300"
                                  : "bg-slate-100/80 text-slate-600"
                            }`}
                          >
                            {isActive ? "Active" : "Node"}
                          </div>
                        </div>

                        <p className={`mt-4 text-sm leading-6 ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                          {getReportPreviewInsight(report)}
                        </p>

                        <div
                          className={`mt-5 flex items-center gap-2 text-sm font-bold transition-all duration-300 ${
                            isDark ? "text-slate-200" : "text-slate-700"
                          } opacity-0 translate-y-1 group-hover:translate-y-0 group-hover:opacity-100`}
                        >
                          Open report story
                          <ArrowUpRight size={14} />
                        </div>
                      </Link>
                    </motion.div>
                  );
                })
              ) : (
                <div className={`px-2 text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                  Timeline activity appears after your first processed report.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

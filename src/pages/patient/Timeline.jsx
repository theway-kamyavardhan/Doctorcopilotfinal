import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronUp, CalendarDays, FlaskConical, Hospital, LoaderCircle, MapPin, Phone, Sparkles, Stethoscope, UserRound, Download } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";
import reportService from "../../services/report.service";
import { buildClinicalInterpretation } from "../../utils/patientIntelligence";
import ExportService from "../../services/ExportService";

function sortReportsAscending(reports) {
  return [...reports].sort((a, b) => {
    const aDate = a.report_date || a.created_at;
    const bDate = b.report_date || b.created_at;
    return new Date(aDate) - new Date(bDate);
  });
}

function formatDate(value) {
  if (!value) return "Pending";
  return new Date(value).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function titleCase(value) {
  if (!value || typeof value !== "string") return null;
  return value.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

function getHighlight(report) {
  const abnormal = report.parameters?.find((item) =>
    ["low", "high", "deficient", "insufficient"].includes(String(item.status || item.interpretation || "").toLowerCase())
  );
  if (abnormal) return `${titleCase(abnormal.name?.replaceAll("_", " ")) || "Parameter"} ${abnormal.status || abnormal.interpretation}`;
  if (report.summary) return report.summary;
  if (report.insights?.length) return report.insights[0]?.description || report.insights[0]?.title || "AI review available";
  return "Structured report available";
}

function getKeywordTags(report) {
  const abnormal = (report.parameters || [])
    .filter((item) => ["low", "high", "deficient", "insufficient"].includes(String(item.status || item.interpretation || "").toLowerCase()))
    .slice(0, 2)
    .map((item) => `${titleCase(item.name?.replaceAll("_", " "))} ${item.status || item.interpretation}`);
  return [...(report.report_keywords || []), ...abnormal].slice(0, 4);
}

function tagClasses(tag, isDark) {
  const n = String(tag || "").toLowerCase();
  if (n.includes("deficien") || n.includes("high") || n.includes("thrombocytopenia")) {
    return isDark ? "bg-red-500/10 text-red-300 border-red-500/20" : "bg-red-50 text-red-700 border-red-200";
  }
  if (n.includes("low") || n.includes("risk")) {
    return isDark ? "bg-amber-500/10 text-amber-300 border-amber-500/20" : "bg-amber-50 text-amber-700 border-amber-200";
  }
  return isDark ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/20" : "bg-emerald-50 text-emerald-700 border-emerald-200";
}

function getMetadata(report) {
  const metadata = report.report_metadata || {};
  const patient = metadata.patient || {};
  const lab = metadata.lab || {};
  const doctor = metadata.doctor || {};
  const reportInfo = metadata.report || metadata.report_info || {};
  return {
    patientName: patient.full_name || patient.name || report.patient_name || "Unknown patient",
    age: patient.age || null,
    labName: lab.lab_name || lab.name || report.lab_name || "Unknown lab",
    labAddress: lab.address || lab.location || "Not available",
    labPhone: lab.phone || "Not available",
    doctorName: doctor.doctor_name || doctor.referring_doctor || report.doctor_name || "Not available",
    doctorContact: doctor.doctor_contact || "Not available",
    doctorSpecialization: doctor.doctor_specialization || "Not available",
    reportDate: reportInfo.report_date || report.report_date || report.created_at,
    reportType: reportInfo.report_type || report.report_type || "Medical Report",
  };
}

// ─── Mobile-optimized timeline card ──────────────────────────────────────────

function MobileTimelineCard({ report, index, isDark, isExpanded, onToggle }) {
  const metadata = getMetadata(report);
  const keywordTags = getKeywordTags(report);
  const clinicalBullets = buildClinicalInterpretation(report);
  const summaryBullets = (report.insights || []).map((i) => i.description || i.title).filter(Boolean).slice(0, 5);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.07, 0.4), duration: 0.35 }}
      className="relative flex gap-3"
    >
      {/* Timeline stem */}
      <div className="flex flex-col items-center pt-1 shrink-0">
        <div className={`w-3 h-3 rounded-full shrink-0 mt-1 ${isDark ? "bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.5)]" : "bg-blue-500"}`} />
        <div className={`w-px flex-1 mt-1 ${isDark ? "bg-white/10" : "bg-slate-200"}`} />
      </div>

      {/* Card body */}
      <div className="flex-1 pb-5 min-w-0">
        {/* Date label */}
        <div className={`text-[11px] font-bold uppercase tracking-widest mb-2 ${isDark ? "text-cyan-400/70" : "text-blue-500/80"}`}>
          {formatDate(metadata.reportDate)}
        </div>

        <div className={`rounded-2xl border overflow-hidden ${isDark ? "bg-slate-900/80 border-white/8" : "bg-white border-slate-200 shadow-sm"}`}>
          {/* Card header — always visible */}
          <div className="p-4">
            <div className={`text-[10px] font-black uppercase tracking-[0.2em] mb-1 ${isDark ? "text-slate-500" : "text-slate-400"}`}>
              {metadata.reportType}
            </div>
            <h3 className={`text-base font-black leading-tight mb-2 ${isDark ? "text-white" : "text-slate-900"}`}>
              {metadata.labName}
            </h3>
            <p className={`text-sm leading-relaxed mb-3 ${isDark ? "text-slate-300" : "text-slate-600"}`}>
              {getHighlight(report)}
            </p>

            {/* Tags */}
            {keywordTags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {keywordTags.map((tag) => (
                  <span key={tag} className={`rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${tagClasses(tag, isDark)}`}>
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {/* Category + date chips */}
            <div className="flex flex-wrap gap-2 text-xs">
              <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-semibold ${isDark ? "bg-cyan-500/10 text-cyan-300" : "bg-blue-50 text-blue-700"}`}>
                {report.report_category || "other"}
              </span>
              <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-semibold ${isDark ? "bg-white/5 text-slate-400" : "bg-slate-100 text-slate-600"}`}>
                <Hospital size={11} /> {metadata.labName}
              </span>
            </div>
          </div>

          {/* Expand / collapse button */}
          <button
            type="button"
            onClick={onToggle}
            style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
            className={`w-full flex items-center justify-between px-4 py-3 text-sm font-bold border-t transition-colors ${
              isDark ? "border-white/8 text-slate-300 active:bg-white/5" : "border-slate-100 text-slate-600 active:bg-slate-50"
            }`}
          >
            <span>{isExpanded ? "Collapse Report" : "View Full Report"}</span>
            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>

          {/* Expanded section */}
          <AnimatePresence initial={false}>
            {isExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="overflow-hidden"
              >
                <div className={`border-t ${isDark ? "border-white/8" : "border-slate-100"} p-4 space-y-5`}>

                  {/* Metadata grid */}
                  <div>
                    <div className={`text-[10px] font-black uppercase tracking-widest mb-3 ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                      Report Info
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { label: "Patient", value: metadata.patientName, icon: UserRound },
                        { label: "Doctor", value: metadata.doctorName, icon: Stethoscope },
                        { label: "Lab", value: metadata.labName, icon: Hospital },
                        { label: "Date", value: formatDate(metadata.reportDate), icon: CalendarDays },
                      ].map((item) => (
                        <div key={item.label} className={`rounded-xl p-3 ${isDark ? "bg-white/5" : "bg-slate-50"}`}>
                          <div className={`flex items-center gap-1 text-[9px] font-black uppercase tracking-widest mb-1 ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                            <item.icon size={10} /> {item.label}
                          </div>
                          <div className={`text-xs font-semibold leading-tight ${isDark ? "text-slate-200" : "text-slate-700"}`}>
                            {item.value}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Clinical interpretation */}
                  {clinicalBullets.length > 0 && (
                    <div>
                      <div className={`text-[10px] font-black uppercase tracking-widest mb-2 ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                        Clinical Notes
                      </div>
                      <div className="space-y-2">
                        {clinicalBullets.slice(0, 3).map((item, i) => (
                          <div key={i} className={`rounded-xl px-3 py-2.5 text-xs leading-relaxed ${isDark ? "bg-amber-500/10 text-slate-200" : "bg-amber-50 text-slate-700"}`}>
                            {item}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* AI summary */}
                  {summaryBullets.length > 0 && (
                    <div>
                      <div className={`text-[10px] font-black uppercase tracking-widest mb-2 ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                        AI Summary
                      </div>
                      <div className="space-y-2">
                        {summaryBullets.slice(0, 3).map((item, i) => (
                          <div key={i} className={`rounded-xl px-3 py-2.5 text-xs leading-relaxed ${isDark ? "bg-cyan-500/10 text-slate-200" : "bg-blue-50 text-slate-700"}`}>
                            {item}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Parameters table — horizontal scroll */}
                  {(report.parameters || []).length > 0 && (
                    <div>
                      <div className={`text-[10px] font-black uppercase tracking-widest mb-2 ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                        Parameters
                      </div>
                      <div className="overflow-x-auto -mx-4 px-4">
                        <table className="w-full min-w-[340px] text-xs border-collapse">
                          <thead>
                            <tr className={`${isDark ? "bg-white/5 text-slate-400" : "bg-slate-50 text-slate-500"}`}>
                              <th className="text-left px-3 py-2 font-black uppercase tracking-wider rounded-tl-xl">Parameter</th>
                              <th className="text-left px-3 py-2 font-black uppercase tracking-wider">Value</th>
                              <th className="text-left px-3 py-2 font-black uppercase tracking-wider">Range</th>
                              <th className="text-left px-3 py-2 font-black uppercase tracking-wider rounded-tr-xl">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {report.parameters.map((param, pi) => (
                              <tr key={pi} className={`border-t ${isDark ? "border-white/5 text-slate-200" : "border-slate-100 text-slate-700"}`}>
                                <td className="px-3 py-2 font-semibold">{titleCase(param.name?.replaceAll("_", " "))}</td>
                                <td className="px-3 py-2">{param.value} {param.unit || ""}</td>
                                <td className="px-3 py-2 text-slate-400">{param.reference_range || "—"}</td>
                                <td className={`px-3 py-2 font-bold ${["low","high","deficient","insufficient"].includes(String(param.status||"").toLowerCase()) ? "text-amber-400" : isDark ? "text-emerald-400" : "text-emerald-600"}`}>
                                  {param.status || param.interpretation || "—"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Export button */}
                  <button
                    type="button"
                    onClick={() => ExportService.exportSingleReportPdf(report.id, "ai")}
                    style={{ touchAction: "manipulation" }}
                    className={`w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold transition-colors ${
                      isDark ? "bg-white/5 text-slate-200 active:bg-white/10" : "bg-slate-100 text-slate-700 active:bg-slate-200"
                    }`}
                  >
                    <Download size={15} /> Export AI PDF
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Main Timeline page ───────────────────────────────────────────────────────

export default function Timeline() {
  const { isDark } = useTheme();
  const [reports, setReports] = useState([]);
  const [trends, setTrends] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedReportId, setExpandedReportId] = useState(null);

  useEffect(() => {
    const loadReports = async () => {
      try {
        const [reportData, trendData] = await Promise.all([
          reportService.getReports(),
          reportService.getTrends(),
        ]);
        setReports(reportData || []);
        setTrends(trendData);
      } catch (err) {
        console.error(err);
        setError(err.message || "Failed to load patient timeline.");
      } finally {
        setLoading(false);
      }
    };
    loadReports();
  }, []);

  const timelineReports = useMemo(() => sortReportsAscending(reports), [reports]);
  const journeySignals = useMemo(() => (trends?.summary || []).slice(0, 5), [trends]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <LoaderCircle size={28} className="animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-0 pb-6">
      {/* Header */}
      <section className="mb-6 grid grid-cols-1 xl:grid-cols-[1.1fr_0.9fr] gap-5 items-start">
        <div>
          <motion.h1
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            className={`text-3xl md:text-5xl font-black tracking-tight ${isDark ? "text-white" : "text-slate-900"}`}
          >
            Medical Journey
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.06 }}
            className={`mt-2 text-sm md:text-lg leading-relaxed ${isDark ? "text-slate-400" : "text-slate-500"}`}
          >
            Your health story in chronological order.
          </motion.p>
        </div>

        {/* Journey Signals card */}
        <div className={`rounded-2xl border p-4 ${isDark ? "bg-slate-900 border-white/10" : "bg-white border-slate-100 shadow-sm"}`}>
          <div className="flex items-center gap-2.5 mb-3">
            <div className={`rounded-xl p-2 ${isDark ? "bg-cyan-500/10 text-cyan-300" : "bg-blue-50 text-blue-700"}`}>
              <Sparkles size={15} />
            </div>
            <div>
              <div className={`text-sm font-black ${isDark ? "text-white" : "text-slate-900"}`}>Journey Signals</div>
              <div className={`text-xs ${isDark ? "text-slate-500" : "text-slate-400"}`}>Cross-report intelligence</div>
            </div>
          </div>
          <div className="space-y-2">
            {journeySignals.length ? (
              journeySignals.map((signal) => (
                <div key={signal} className={`rounded-xl px-3 py-2.5 text-xs leading-relaxed ${isDark ? "bg-cyan-500/10 text-slate-200" : "bg-blue-50 text-slate-700"}`}>
                  {signal}
                </div>
              ))
            ) : (
              <div className={`rounded-xl px-3 py-2 text-xs ${isDark ? "bg-white/5 text-slate-400" : "bg-slate-50 text-slate-500"}`}>
                Upload more reports to unlock richer signals.
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Error */}
      {error && (
        <div className="mb-4 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-500">
          {error}
        </div>
      )}

      {/* Timeline */}
      {timelineReports.length ? (
        <div className="space-y-1">
          {timelineReports.map((report, index) => (
            <MobileTimelineCard
              key={report.id}
              report={report}
              index={index}
              isDark={isDark}
              isExpanded={expandedReportId === report.id}
              onToggle={() => setExpandedReportId((cur) => (cur === report.id ? null : report.id))}
            />
          ))}
        </div>
      ) : (
        <div className={`rounded-2xl border border-dashed p-10 text-center text-sm ${isDark ? "border-white/10 text-slate-500" : "border-slate-200 text-slate-400"}`}>
          Upload reports to start building your medical journey.
        </div>
      )}
    </div>
  );
}

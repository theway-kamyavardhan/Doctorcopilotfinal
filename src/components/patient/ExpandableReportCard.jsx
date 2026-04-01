import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  CalendarDays,
  ChevronDown,
  ChevronUp,
  Download,
  FlaskConical,
  Hospital,
  MapPin,
  Phone,
  Stethoscope,
  UserRound,
} from "lucide-react";
import { buildClinicalInterpretation } from "../../utils/patientIntelligence";
import ExportService from "../../services/ExportService";

function formatDate(value) {
  if (!value) return "Date pending";
  return new Date(value).toLocaleDateString();
}

function titleCase(value) {
  if (!value || typeof value !== "string") return null;
  return value.toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

function getHighlight(report) {
  const abnormal = report.parameters?.find((item) =>
    ["low", "high", "deficient", "insufficient"].includes(
      String(item.status || item.interpretation || "").toLowerCase()
    )
  );

  if (abnormal) {
    return `${titleCase(abnormal.name?.replaceAll("_", " ")) || "Parameter"} ${abnormal.status || abnormal.interpretation}`;
  }

  if (report.summary) return report.summary;
  if (report.insights?.length) return report.insights[0]?.description || report.insights[0]?.title || "AI review available";
  return "Structured report available";
}

function getKeywordTags(report) {
  const abnormal = (report.parameters || [])
    .filter((item) =>
      ["low", "high", "deficient", "insufficient"].includes(
        String(item.status || item.interpretation || "").toLowerCase()
      )
    )
    .slice(0, 2)
    .map((item) => `${titleCase(item.name?.replaceAll("_", " "))} ${item.status || item.interpretation}`);

  return [...(report.report_keywords || []), ...abnormal].slice(0, 4);
}

function tagClasses(tag, isDark) {
  const normalized = String(tag || "").toLowerCase();
  if (normalized.includes("deficien") || normalized.includes("thrombocytopenia") || normalized.includes("high")) {
    return isDark ? "bg-red-500/10 text-red-300 border-red-500/20" : "bg-red-50 text-red-700 border-red-200";
  }
  if (normalized.includes("low") || normalized.includes("risk")) {
    return isDark ? "bg-amber-500/10 text-amber-300 border-amber-500/20" : "bg-amber-50 text-amber-700 border-amber-200";
  }
  return isDark ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/20" : "bg-emerald-50 text-emerald-700 border-emerald-200";
}

function getSummaryBullets(report) {
  const bullets = (report.insights || [])
    .map((item) => item.description || item.title)
    .filter(Boolean)
    .slice(0, 5);

  if (bullets.length) return bullets;
  if (report.summary) return [report.summary];
  return ["AI summary will appear here once comparative analysis expands."];
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

export default function ExpandableReportCard({ report, isExpanded, onToggle, isDark, index }) {
  const metadata = getMetadata(report);
  const summaryBullets = getSummaryBullets(report);
  const clinicalInterpretation = buildClinicalInterpretation(report);
  const interpretationBullets = clinicalInterpretation.length
    ? clinicalInterpretation
    : ["No abnormal interpretation was generated for this report."];
  const keywordTags = getKeywordTags(report);

  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.08, 0.45), duration: 0.45 }}
      className="relative grid grid-cols-[110px_1fr] gap-5"
    >
      <div className="relative flex flex-col items-center">
        <div className={`z-10 rounded-full px-4 py-3 text-center ${isDark ? "bg-slate-900 border border-white/10 text-cyan-300" : "bg-white border border-slate-200 text-blue-700 shadow-sm"}`}>
          <div className="text-xs font-black uppercase tracking-[0.24em]">Report</div>
          <div className="mt-1 text-sm font-bold">{formatDate(metadata.reportDate)}</div>
        </div>
        <div className={`mt-3 h-full w-px ${isDark ? "bg-white/10" : "bg-slate-200"}`} />
      </div>

      <motion.div
        whileHover={{ y: -4 }}
        className={`group rounded-[2rem] border p-6 transition-all duration-300 ${
          isDark
            ? "bg-slate-900/90 border-white/10 hover:border-cyan-400/30"
            : "bg-white/90 border-slate-200 hover:border-blue-300 shadow-lg shadow-slate-100/60"
        }`}
      >
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div className="space-y-3">
            <div>
              <div className={`text-xs font-black uppercase tracking-[0.28em] ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                {metadata.reportType}
              </div>
              <h3 className={`mt-2 text-2xl font-black ${isDark ? "text-white" : "text-slate-900"}`}>
                {metadata.labName}
              </h3>
            </div>

            <div className={`text-sm leading-6 ${isDark ? "text-slate-300" : "text-slate-600"}`}>
              {getHighlight(report)}
            </div>

            <div className="flex flex-wrap gap-3 text-sm">
              <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 ${isDark ? "bg-cyan-500/10 text-cyan-300" : "bg-blue-50 text-blue-700"}`}>
                {report.report_category || "other"}
              </span>
              <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 ${isDark ? "bg-white/5 text-slate-300" : "bg-slate-100 text-slate-700"}`}>
                <CalendarDays size={14} />
                {formatDate(metadata.reportDate)}
              </span>
              <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 ${isDark ? "bg-white/5 text-slate-300" : "bg-slate-100 text-slate-700"}`}>
                <Hospital size={14} />
                {metadata.labName}
              </span>
            </div>

            {keywordTags.length ? (
              <div className="flex flex-wrap gap-2">
                {keywordTags.map((tag) => (
                  <span key={`${report.id}-${tag}`} className={`rounded-full border px-3 py-1 text-xs font-bold ${tagClasses(tag, isDark)}`}>
                    {tag}
                  </span>
                ))}
              </div>
            ) : null}
          </div>

          <button
            type="button"
            onClick={onToggle}
            className={`inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold transition-colors ${
              isDark ? "bg-white/5 text-slate-200 hover:bg-white/10" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            {isExpanded ? "Collapse Report" : "Expand Report"}
            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>

        <AnimatePresence initial={false}>
          {isExpanded ? (
            <motion.div
              initial={{ opacity: 0, height: 0, marginTop: 0 }}
              animate={{ opacity: 1, height: "auto", marginTop: 24 }}
              exit={{ opacity: 0, height: 0, marginTop: 0 }}
              transition={{ duration: 0.28 }}
              className="overflow-hidden"
            >
              <div className={`grid grid-cols-1 xl:grid-cols-[0.9fr_1.1fr] gap-6 border-t pt-6 ${isDark ? "border-white/10" : "border-slate-200"}`}>
                <div className="space-y-5">
                  <div>
                    <h4 className={`text-sm font-black uppercase tracking-[0.24em] mb-3 ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                      Metadata
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {[
                        { label: "Patient", value: metadata.patientName, icon: UserRound },
                        { label: "Age", value: metadata.age || "Unknown", icon: UserRound },
                        { label: "Lab", value: metadata.labName, icon: Hospital },
                        { label: "Doctor", value: metadata.doctorName, icon: Stethoscope },
                        { label: "Report Date", value: formatDate(metadata.reportDate), icon: CalendarDays },
                        { label: "Type", value: metadata.reportType, icon: FlaskConical },
                      ].map((item) => (
                        <div key={item.label} className={`rounded-2xl px-4 py-4 ${isDark ? "bg-white/5" : "bg-slate-50"}`}>
                          <div className={`inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                            <item.icon size={14} />
                            {item.label}
                          </div>
                          <div className={`mt-2 text-sm font-semibold ${isDark ? "text-slate-200" : "text-slate-700"}`}>
                            {item.value}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className={`text-sm font-black uppercase tracking-[0.24em] mb-3 ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                      Visit Details
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
                      {[
                        { label: "Visited", value: metadata.labName, icon: Hospital },
                        { label: "Location", value: metadata.labAddress, icon: MapPin },
                        { label: "Lab Contact", value: metadata.labPhone, icon: Phone },
                        { label: "Doctor Contact", value: metadata.doctorContact, icon: Phone },
                        { label: "Doctor Specialty", value: metadata.doctorSpecialization, icon: Stethoscope },
                        { label: "Visit Date", value: formatDate(metadata.reportDate), icon: CalendarDays },
                      ].map((item) => (
                        <div key={item.label} className={`rounded-2xl px-4 py-4 ${isDark ? "bg-white/5" : "bg-slate-50"}`}>
                          <div className={`inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                            <item.icon size={14} />
                            {item.label}
                          </div>
                          <div className={`mt-2 text-sm font-semibold ${isDark ? "text-slate-200" : "text-slate-700"}`}>
                            {item.value}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className={`text-sm font-black uppercase tracking-[0.24em] mb-3 ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                      Clinical Interpretation
                    </h4>
                    <div className="space-y-3">
                      {interpretationBullets.map((item, bulletIndex) => (
                        <div
                          key={`${report.id}-clinical-${bulletIndex}`}
                          className={`rounded-2xl px-4 py-3 ${isDark ? "bg-amber-500/10 text-slate-200" : "bg-amber-50 text-slate-700"}`}
                        >
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className={`text-sm font-black uppercase tracking-[0.24em] mb-3 ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                      AI Summary
                    </h4>
                    <div className="space-y-3">
                      {summaryBullets.map((item, bulletIndex) => (
                        <div
                          key={`${report.id}-summary-${bulletIndex}`}
                          className={`rounded-2xl px-4 py-3 ${isDark ? "bg-cyan-500/10 text-slate-200" : "bg-blue-50 text-slate-700"}`}
                        >
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-5">
                  <div>
                    <h4 className={`text-sm font-black uppercase tracking-[0.24em] mb-3 ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                      Parameters
                    </h4>
                    <div className={`overflow-hidden rounded-2xl border ${isDark ? "border-white/10" : "border-slate-200"}`}>
                      <div className={`grid grid-cols-[1.2fr_0.8fr_1fr_0.8fr] gap-3 px-4 py-3 text-xs font-black uppercase tracking-[0.2em] ${isDark ? "bg-white/5 text-slate-500" : "bg-slate-50 text-slate-400"}`}>
                        <div>Parameter</div>
                        <div>Value</div>
                        <div>Range</div>
                        <div>Status</div>
                      </div>
                      {(report.parameters || []).length ? (
                        report.parameters.map((parameter) => (
                          <div
                            key={`${report.id}-${parameter.name}`}
                            className={`grid grid-cols-[1.2fr_0.8fr_1fr_0.8fr] gap-3 px-4 py-3 text-sm border-t ${isDark ? "border-white/10 text-slate-200" : "border-slate-200 text-slate-700"}`}
                          >
                            <div className="font-semibold">{titleCase(parameter.name?.replaceAll("_", " "))}</div>
                            <div>{parameter.value} {parameter.unit || ""}</div>
                            <div>{parameter.reference_range || "-"}</div>
                            <div className="font-bold">{parameter.status || parameter.interpretation || "unknown"}</div>
                          </div>
                        ))
                      ) : (
                        <div className={`px-4 py-5 text-sm ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                          No structured parameters were stored for this report.
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <h4 className={`text-sm font-black uppercase tracking-[0.24em] mb-3 ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                      Extracted Report
                    </h4>
                    <div className={`rounded-2xl px-4 py-4 text-sm leading-6 ${isDark ? "bg-white/5 text-slate-300" : "bg-slate-50 text-slate-700"}`}>
                      {report.raw_text || report.extracted_data?.summary || report.summary || "Raw extracted text is not available for this report."}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => ExportService.exportSingleReportPdf(report.id, "ai")}
                    className={`inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold transition-colors ${
                      isDark ? "bg-white/5 text-slate-200 hover:bg-white/10" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    <Download size={16} />
                    Export AI PDF
                  </button>
                </div>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}

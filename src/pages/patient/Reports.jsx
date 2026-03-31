import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../../context/ThemeContext";
import reportService from "../../services/report.service";
import {
  CheckCircle2,
  Clock3,
  Download,
  Search,
  Trash2,
  FileText,
  LoaderCircle,
  RefreshCcw,
  Upload,
  XCircle,
} from "lucide-react";
import { formatParameterLabel, isAbnormalStatus } from "../../utils/patientIntelligence";
import ExportService from "../../services/ExportService";

const CATEGORY_TABS = [
  { key: "all", label: "All" },
  { key: "blood", label: "Blood" },
  { key: "liver", label: "Liver" },
  { key: "kidney", label: "Kidney" },
  { key: "thyroid", label: "Thyroid" },
  { key: "radiology", label: "Radiology" },
  { key: "vitamin", label: "Vitamin" },
  { key: "other", label: "Other" },
];

function buildQueueItem(file) {
  return {
    id: `${file.name}-${file.size}-${file.lastModified}`,
    file,
    status: "ready",
    message: "Ready to upload",
  };
}

function mergeQueue(existingItems, files) {
  const next = [...existingItems];
  const seen = new Set(existingItems.map((item) => item.id));

  files.forEach((file) => {
    const queueItem = buildQueueItem(file);
    if (!seen.has(queueItem.id)) {
      next.push(queueItem);
      seen.add(queueItem.id);
    }
  });

  return next;
}

function formatDate(value) {
  if (!value) return "Date pending";
  return new Date(value).toLocaleDateString();
}

function statusStyles(status) {
  switch (status) {
    case "uploading":
      return "text-blue-500";
    case "processing":
      return "text-amber-500";
    case "completed":
      return "text-emerald-500";
    case "error":
      return "text-red-500";
    default:
      return "text-slate-500";
  }
}

function StatusIcon({ status }) {
  if (status === "uploading" || status === "processing") {
    return <LoaderCircle size={16} className="animate-spin" />;
  }
  if (status === "completed") {
    return <CheckCircle2 size={16} />;
  }
  if (status === "error") {
    return <XCircle size={16} />;
  }
  return <Clock3 size={16} />;
}

function getTagClasses(tag, isDark) {
  const normalized = String(tag || "").toLowerCase();
  if (normalized.includes("deficien") || normalized.includes("thrombocytopenia") || normalized.includes("high")) {
    return isDark ? "bg-red-500/10 text-red-300 border-red-500/20" : "bg-red-50 text-red-700 border-red-200";
  }
  if (normalized.includes("low") || normalized.includes("risk")) {
    return isDark ? "bg-amber-500/10 text-amber-300 border-amber-500/20" : "bg-amber-50 text-amber-700 border-amber-200";
  }
  return isDark ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/20" : "bg-emerald-50 text-emerald-700 border-emerald-200";
}

function buildSearchBlob(report) {
  const keywords = report.report_keywords || [];
  const parameterNames = (report.parameters || []).map((item) => item.name);
  const insights = (report.insights || []).map((item) => `${item.title} ${item.description}`);
  return [
    report.file_name,
    report.report_type,
    report.report_category,
    report.lab_name,
    report.summary,
    ...keywords,
    ...parameterNames,
    ...insights,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function buildCategoryCounts(reports) {
  const counts = { all: reports.length };
  reports.forEach((report) => {
    const key = report.report_category || "other";
    counts[key] = (counts[key] || 0) + 1;
  });
  return counts;
}

export default function Reports() {
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [queue, setQueue] = useState([]);
  const [reports, setReports] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState("");
  const [workflowReady, setWorkflowReady] = useState(false);
  const [reportPendingDelete, setReportPendingDelete] = useState(null);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [activeCategory, setActiveCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const sortedReports = useMemo(() => {
    return [...reports].sort((a, b) => {
      const aDate = a.report_date || a.created_at;
      const bDate = b.report_date || b.created_at;
      return new Date(bDate) - new Date(aDate);
    });
  }, [reports]);

  const categoryCounts = useMemo(() => buildCategoryCounts(sortedReports), [sortedReports]);

  const filteredReports = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return sortedReports.filter((report) => {
      const matchesCategory = activeCategory === "all" || (report.report_category || "other") === activeCategory;
      if (!matchesCategory) return false;
      if (!query) return true;
      return buildSearchBlob(report).includes(query);
    });
  }, [sortedReports, activeCategory, searchQuery]);

  const refreshWorkflow = async () => {
    const [reportsData] = await Promise.all([
      reportService.getReports(),
      reportService.getTrends(),
      reportService.getInsights(),
    ]);
    setReports(reportsData || []);
    setWorkflowReady(true);
  };

  useEffect(() => {
    const loadReports = async () => {
      try {
        await refreshWorkflow();
      } catch (err) {
        console.error(err);
        setError(err.message || "Failed to load reports.");
      } finally {
        setLoading(false);
      }
    };

    loadReports();
  }, []);

  const pushFiles = (fileList) => {
    if (!fileList?.length) return;
    setQueue((current) => mergeQueue(current, Array.from(fileList)));
    setError("");
  };

  const updateQueueItem = (id, patch) => {
    setQueue((current) =>
      current.map((item) => (item.id === id ? { ...item, ...patch } : item))
    );
  };

  const handleFileChange = (event) => {
    pushFiles(event.target.files);
    event.target.value = "";
  };

  const handleUpload = async () => {
    if (!queue.length || uploading) return;

    setUploading(true);
    setError("");

    for (const item of queue) {
      if (item.status === "completed") continue;

      try {
        updateQueueItem(item.id, { status: "uploading", message: "Uploading report..." });
        const response = await reportService.uploadReport(item.file);
        updateQueueItem(item.id, {
          status: "processing",
          message: response?.processing_state || "AI processing completed. Refreshing insights...",
        });

        await refreshWorkflow();

        updateQueueItem(item.id, {
          status: "completed",
          message: "Stored, analyzed, categorized, and added to trends.",
        });
      } catch (err) {
        console.error(err);
        updateQueueItem(item.id, {
          status: "error",
          message: err.message || "Upload failed.",
        });
        setError(err.message || "One or more uploads failed.");
      }
    }

    setUploading(false);
  };

  const openDeleteDialog = (report) => {
    setReportPendingDelete(report);
    setDeleteConfirmationText("");
    setError("");
  };

  const closeDeleteDialog = () => {
    if (isDeleting) return;
    setReportPendingDelete(null);
    setDeleteConfirmationText("");
  };

  const handleDeleteReport = async () => {
    if (!reportPendingDelete || deleteConfirmationText.trim().toLowerCase() !== "confirm") {
      return;
    }

    setIsDeleting(true);
    setError("");

    try {
      await reportService.deleteReport(reportPendingDelete.id);
      await refreshWorkflow();
      setReportPendingDelete(null);
      setDeleteConfirmationText("");
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to delete report.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 px-4 md:px-0">
      <section className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 className={`text-4xl font-black tracking-tight ${isDark ? "text-white" : "text-slate-900"}`}>
            Medical Intelligence Reports
          </h1>
          <p className={`${isDark ? "text-slate-400" : "text-slate-500"} mt-2 font-medium`}>
            Upload reports, let AI classify them, and explore them by category, condition, and keywords.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className={`px-5 py-3 rounded-2xl font-bold transition-colors ${
              isDark ? "bg-white/5 text-slate-200 hover:bg-white/10" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            Select Files
          </button>
          <button
            type="button"
            onClick={() => navigate("/patient/trends")}
            className="px-5 py-3 rounded-2xl bg-blue-600 text-white font-bold hover:bg-blue-500 transition-colors"
          >
            View Trends
          </button>
        </div>
      </section>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".pdf,image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      <section
        role="button"
        tabIndex={0}
        onClick={() => fileInputRef.current?.click()}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            fileInputRef.current?.click();
          }
        }}
        onDragOver={(event) => {
          event.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          setDragActive(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          setDragActive(false);
          pushFiles(event.dataTransfer.files);
        }}
        className={`rounded-[2rem] border-2 border-dashed p-10 text-center cursor-pointer transition-all ${
          dragActive
            ? "border-blue-500 bg-blue-500/10"
            : isDark
              ? "border-white/10 bg-slate-900/80 hover:border-blue-500/40"
              : "border-slate-200 bg-white hover:border-blue-400"
        }`}
      >
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-500">
          <Upload size={28} />
        </div>
        <h2 className={`text-2xl font-black ${isDark ? "text-white" : "text-slate-900"}`}>
          Drop reports here or click to upload
        </h2>
        <p className={`mt-2 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
          Supports single or multiple PDF and image reports.
        </p>
      </section>

      <section className={`rounded-[2rem] border p-6 ${isDark ? "bg-slate-900 border-white/10" : "bg-white border-slate-100"}`}>
        <div className="flex items-center justify-between gap-4 mb-5">
          <div>
            <h3 className={`text-xl font-black ${isDark ? "text-white" : "text-slate-900"}`}>Upload Queue</h3>
            <p className={`${isDark ? "text-slate-400" : "text-slate-500"} text-sm`}>
              Each report is uploaded, processed, categorized, and added into your trend engine.
            </p>
          </div>
          <button
            type="button"
            onClick={handleUpload}
            disabled={!queue.length || uploading}
            className="px-5 py-3 rounded-2xl bg-emerald-600 text-white font-bold hover:bg-emerald-500 transition-colors disabled:opacity-50"
          >
            {uploading ? "Processing..." : "Upload Reports"}
          </button>
        </div>

        {queue.length ? (
          <div className="space-y-3">
            {queue.map((item) => (
              <div
                key={item.id}
                className={`flex flex-col md:flex-row md:items-center md:justify-between gap-2 rounded-2xl px-4 py-4 ${
                  isDark ? "bg-white/5" : "bg-slate-50"
                }`}
              >
                <div className="flex items-start gap-3">
                  <FileText size={18} className={isDark ? "text-slate-400 mt-0.5" : "text-slate-500 mt-0.5"} />
                  <div>
                    <div className={`font-bold ${isDark ? "text-white" : "text-slate-900"}`}>{item.file.name}</div>
                    <div className={`text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>{item.message}</div>
                  </div>
                </div>
                <div className={`flex items-center gap-2 text-sm font-bold ${statusStyles(item.status)}`}>
                  <StatusIcon status={item.status} />
                  <span className="capitalize">{item.status}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className={`rounded-2xl border border-dashed px-4 py-8 text-center ${isDark ? "border-white/10 text-slate-500" : "border-slate-200 text-slate-400"}`}>
            No files selected yet.
          </div>
        )}

        {error ? (
          <div className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-500">
            {error}
          </div>
        ) : null}
      </section>

      <section className={`rounded-[2rem] border p-6 ${isDark ? "bg-slate-900 border-white/10" : "bg-white border-slate-100"}`}>
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-5">
          <div>
            <h3 className={`text-xl font-black ${isDark ? "text-white" : "text-slate-900"}`}>Stored Reports</h3>
            <p className={`${isDark ? "text-slate-400" : "text-slate-500"} text-sm`}>
              Search by parameter, keyword, or condition and filter the timeline by category.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className={`inline-flex items-center gap-2 rounded-2xl px-4 py-3 ${isDark ? "bg-white/5 text-slate-200" : "bg-slate-100 text-slate-700"}`}>
              <Search size={16} />
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search b12, anemia, platelets..."
                className="bg-transparent outline-none min-w-[220px]"
              />
            </div>
            <button
              type="button"
              onClick={refreshWorkflow}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl font-semibold ${
                isDark ? "bg-white/5 text-slate-200 hover:bg-white/10" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              <RefreshCcw size={16} />
              Refresh
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 mb-6">
          {CATEGORY_TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveCategory(tab.key)}
              className={`rounded-full border px-4 py-2 text-sm font-bold transition-all ${
                activeCategory === tab.key
                  ? isDark
                    ? "border-cyan-400/40 bg-cyan-500/10 text-cyan-300 shadow-[0_0_24px_rgba(34,211,238,0.15)]"
                    : "border-blue-300 bg-blue-50 text-blue-700 shadow-[0_0_20px_rgba(59,130,246,0.12)]"
                  : isDark
                    ? "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
                    : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
              }`}
            >
              {tab.label} <span className="opacity-70">{categoryCounts[tab.key] || 0}</span>
            </button>
          ))}
        </div>

        {loading ? (
          <div className="py-10 flex justify-center">
            <LoaderCircle size={24} className="animate-spin text-blue-500" />
          </div>
        ) : filteredReports.length ? (
          <div className="space-y-4">
            {filteredReports.map((report) => {
              const abnormalTags = (report.parameters || [])
                .filter((item) => isAbnormalStatus(item.status || item.interpretation))
                .slice(0, 3)
                .map((item) => `${formatParameterLabel(item.name)} ${item.status || item.interpretation}`);
              const tags = [...(report.report_keywords || []), ...abnormalTags].slice(0, 5);

              return (
                <div
                  key={report.id}
                  className={`rounded-[2rem] px-5 py-5 transition-all ${
                    isDark ? "bg-white/5 hover:bg-white/7" : "bg-slate-50 hover:bg-slate-100"
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                    <div className="space-y-3">
                      <div>
                        <div className={`text-xs font-black uppercase tracking-[0.24em] ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                          {report.report_category || "other"}
                        </div>
                        <div className={`mt-2 text-xl font-black ${isDark ? "text-white" : "text-slate-900"}`}>
                          {report.report_type || report.file_name}
                        </div>
                        <div className={`mt-1 text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                          {formatDate(report.report_date || report.created_at)} {report.lab_name ? `• ${report.lab_name}` : ""}
                        </div>
                      </div>

                      <div className={`text-sm leading-6 ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                        {report.summary || "Structured report stored and available for timeline intelligence."}
                      </div>

                      {tags.length ? (
                        <div className="flex flex-wrap gap-2">
                          {tags.map((tag) => (
                            <span
                              key={`${report.id}-${tag}`}
                              className={`rounded-full border px-3 py-1 text-xs font-bold ${getTagClasses(tag, isDark)}`}
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </div>

                    <div className="flex items-center gap-3 flex-wrap lg:justify-end">
                      <span className={`rounded-full px-3 py-1 text-xs font-bold ${
                        report.status === "processed"
                          ? "bg-emerald-500/10 text-emerald-500"
                          : report.status === "failed"
                            ? "bg-red-500/10 text-red-500"
                            : "bg-amber-500/10 text-amber-500"
                      }`}>
                        {report.status}
                      </span>
                      <button
                        type="button"
                        onClick={() => navigate("/patient/timeline")}
                        className={`rounded-xl px-3 py-2 text-xs font-bold transition-colors ${
                          isDark ? "bg-white/5 text-slate-200 hover:bg-white/10" : "bg-white text-slate-700 hover:bg-slate-200"
                        }`}
                      >
                        Open Journey
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          ExportService.exportAiHealthSummary({
                            reports: [report],
                            selectedReport: report,
                            trends: { summary: [], anomalies: [] },
                            insights: { key_findings: [] },
                            profile: { user: { full_name: report.patient_name || "Patient" } },
                          })
                        }
                        className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold transition-colors ${
                          isDark ? "bg-white/5 text-slate-200 hover:bg-white/10" : "bg-white text-slate-700 hover:bg-slate-200"
                        }`}
                      >
                        <Download size={13} />
                        Export
                      </button>
                      <button
                        type="button"
                        onClick={() => openDeleteDialog(report)}
                        className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold text-red-500 hover:bg-red-500/10 transition-colors"
                      >
                        <Trash2 size={14} />
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className={`rounded-2xl border border-dashed px-4 py-8 text-center ${isDark ? "border-white/10 text-slate-500" : "border-slate-200 text-slate-400"}`}>
            No reports match the selected category or search query.
          </div>
        )}
      </section>

      {workflowReady ? (
        <div className={`rounded-2xl px-5 py-4 ${isDark ? "bg-blue-500/10 text-blue-300" : "bg-blue-50 text-blue-700"}`}>
          Reports uploaded here feed directly into AI extraction, category tagging, condition keywords, patient insights, and the trend dashboard.
        </div>
      ) : null}

      {reportPendingDelete ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4">
          <div className={`w-full max-w-lg rounded-[2rem] border p-6 ${isDark ? "bg-slate-900 border-white/10" : "bg-white border-slate-200 shadow-xl"}`}>
            <h3 className={`text-2xl font-black ${isDark ? "text-white" : "text-slate-900"}`}>
              Delete Report
            </h3>
            <p className={`${isDark ? "text-slate-400" : "text-slate-500"} mt-3 leading-7`}>
              This will remove the report from storage and recompute timeline and trend data using the remaining reports.
              Type <span className="font-black">confirm</span> to delete this report.
            </p>

            <div className={`mt-5 rounded-2xl px-4 py-4 ${isDark ? "bg-white/5 text-slate-200" : "bg-slate-50 text-slate-700"}`}>
              <div className="font-bold">{reportPendingDelete.file_name}</div>
              <div className="text-sm mt-1">
                {formatDate(reportPendingDelete.report_date || reportPendingDelete.created_at)}
              </div>
            </div>

            <div className="mt-5">
              <input
                value={deleteConfirmationText}
                onChange={(event) => setDeleteConfirmationText(event.target.value)}
                placeholder="Type confirm"
                className={`w-full rounded-2xl border px-4 py-4 outline-none ${
                  isDark
                    ? "bg-white/5 border-white/10 text-white placeholder:text-slate-500"
                    : "bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400"
                }`}
              />
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={closeDeleteDialog}
                disabled={isDeleting}
                className={`rounded-2xl px-4 py-3 font-bold transition-colors ${
                  isDark ? "bg-white/5 text-slate-200 hover:bg-white/10" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                } disabled:opacity-50`}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteReport}
                disabled={isDeleting || deleteConfirmationText.trim().toLowerCase() !== "confirm"}
                className="rounded-2xl bg-red-600 px-4 py-3 font-bold text-white hover:bg-red-500 transition-colors disabled:opacity-50"
              >
                {isDeleting ? "Deleting..." : "Delete Report"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

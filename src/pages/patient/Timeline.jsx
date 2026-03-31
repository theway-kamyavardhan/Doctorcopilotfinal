import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { LoaderCircle, Sparkles } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";
import ExpandableReportCard from "../../components/patient/ExpandableReportCard";
import reportService from "../../services/report.service";

function sortReportsAscending(reports) {
  return [...reports].sort((a, b) => {
    const aDate = a.report_date || a.created_at;
    const bDate = b.report_date || b.created_at;
    return new Date(aDate) - new Date(bDate);
  });
}

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
    <div className="max-w-6xl mx-auto space-y-8 px-4 md:px-0">
      <section className="grid grid-cols-1 xl:grid-cols-[1.1fr_0.9fr] gap-6 items-start">
        <div className="max-w-3xl">
          <motion.h1
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            className={`text-4xl md:text-5xl font-black tracking-tight ${isDark ? "text-white" : "text-slate-900"}`}
          >
            Medical Journey
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.06 }}
            className={`mt-3 text-lg ${isDark ? "text-slate-400" : "text-slate-500"}`}
          >
            Follow your health story in chronological order, expand any report, and see how findings evolve over time.
          </motion.p>
        </div>

        <div className={`rounded-[2rem] border p-6 ${isDark ? "bg-slate-900 border-white/10" : "bg-white border-slate-100 shadow-lg shadow-slate-100/50"}`}>
          <div className="flex items-center gap-3 mb-4">
            <div className={`rounded-2xl p-3 ${isDark ? "bg-cyan-500/10 text-cyan-300" : "bg-blue-50 text-blue-700"}`}>
              <Sparkles size={18} />
            </div>
            <div>
              <h2 className={`text-xl font-black ${isDark ? "text-white" : "text-slate-900"}`}>Journey Signals</h2>
              <p className={`text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                Cross-report intelligence currently shaping your timeline.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {journeySignals.length ? (
              journeySignals.map((signal) => (
                <div
                  key={signal}
                  className={`rounded-2xl px-4 py-3 ${isDark ? "bg-cyan-500/10 text-slate-200" : "bg-blue-50 text-slate-700"}`}
                >
                  {signal}
                </div>
              ))
            ) : (
              <div className={`rounded-2xl px-4 py-3 text-sm ${isDark ? "bg-white/5 text-slate-400" : "bg-slate-50 text-slate-500"}`}>
                Upload more reports to unlock richer cross-report evolution signals.
              </div>
            )}
          </div>
        </div>
      </section>

      {error ? (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-500">
          {error}
        </div>
      ) : null}

      {timelineReports.length ? (
        <div className="space-y-8">
          {timelineReports.map((report, index) => (
            <ExpandableReportCard
              key={report.id}
              report={report}
              index={index}
              isDark={isDark}
              isExpanded={expandedReportId === report.id}
              onToggle={() =>
                setExpandedReportId((current) => (current === report.id ? null : report.id))
              }
            />
          ))}
        </div>
      ) : (
        <div className={`rounded-[2rem] border border-dashed p-10 text-center ${isDark ? "border-white/10 text-slate-500" : "border-slate-200 text-slate-400"}`}>
          Upload reports to start building your medical journey.
        </div>
      )}
    </div>
  );
}

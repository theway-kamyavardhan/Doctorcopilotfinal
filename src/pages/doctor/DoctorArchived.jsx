import React, { useEffect, useMemo, useState } from "react";
import { Archive, LoaderCircle, RefreshCcw } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";
import { getDoctorCase, getDoctorCases, getPatientTrendOverview } from "../../services/doctor.service";

function formatDate(value) {
  if (!value) return "Date pending";
  return new Date(value).toLocaleDateString();
}

export default function DoctorArchived() {
  const { isDark } = useTheme();
  const [cases, setCases] = useState([]);
  const [selectedCase, setSelectedCase] = useState(null);
  const [selectedTrends, setSelectedTrends] = useState(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState("");

  const archivedCases = useMemo(
    () => cases.filter((item) => item.status === "closed" || item.status === "transferred"),
    [cases]
  );

  const loadCases = async () => {
    try {
      const data = await getDoctorCases();
      setCases(data || []);
      setError("");
    } catch (loadError) {
      setError(loadError.message || "Failed to load archived cases.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCases();
  }, []);

  const handleSelectCase = async (caseId) => {
    setDetailLoading(true);
    try {
      const data = await getDoctorCase(caseId);
      setSelectedCase(data);
      if (data?.patient?.id) {
        const trends = await getPatientTrendOverview(data.patient.id);
        setSelectedTrends(trends);
      } else {
        setSelectedTrends(null);
      }
      setError("");
    } catch (loadError) {
      setError(loadError.message || "Failed to load archived case overview.");
    } finally {
      setDetailLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <LoaderCircle size={28} className="animate-spin text-cyan-400" />
      </div>
    );
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[0.92fr,1.08fr]">
      <section className={`rounded-[1.9rem] border p-6 ${isDark ? "border-white/10 bg-white/[0.03]" : "border-slate-200 bg-slate-50/80"}`}>
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className={`text-[11px] font-black uppercase tracking-[0.24em] ${isDark ? "text-cyan-200/75" : "text-blue-700/75"}`}>
              Archived
            </div>
            <h2 className="mt-2 text-3xl font-bold tracking-tight">Closed Cases</h2>
          </div>
          <button
            type="button"
            onClick={loadCases}
            className={`inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold ${isDark ? "bg-white/5 text-slate-200 hover:bg-white/10" : "bg-white text-slate-700 hover:bg-slate-200"}`}
          >
            <RefreshCcw size={16} />
            Refresh
          </button>
        </div>

        {error ? (
          <div className={`mt-5 rounded-2xl px-4 py-3 text-sm font-semibold ${isDark ? "bg-red-500/10 text-red-300" : "bg-red-50 text-red-700"}`}>
            {error}
          </div>
        ) : null}

        <div className="mt-5 space-y-3">
          {archivedCases.length ? (
            archivedCases.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelectCase(item.id)}
                className={`w-full rounded-2xl border px-4 py-4 text-left transition-all ${isDark ? "border-white/10 bg-white/[0.03] hover:bg-white/[0.05]" : "border-slate-200 bg-white hover:bg-slate-50"}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-bold">{item.patient?.full_name || item.patient_name || "Patient"}</div>
                    <div className={`mt-1 text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                      Closed {formatDate(item.closed_at || item.updated_at)} • {item.report_count || 0} reports
                    </div>
                    <div className={`mt-2 text-sm ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                      {item.closing_note || item.description || "Archived consultation summary unavailable."}
                    </div>
                  </div>
                  <div className={`rounded-full px-3 py-1 text-xs font-black uppercase tracking-[0.16em] ${isDark ? "bg-slate-500/10 text-slate-300" : "bg-slate-100 text-slate-600"}`}>
                    {item.status}
                  </div>
                </div>
              </button>
            ))
          ) : (
            <div className={`rounded-2xl border border-dashed px-4 py-10 text-center ${isDark ? "border-white/10 text-slate-500" : "border-slate-200 text-slate-400"}`}>
              No archived cases yet.
            </div>
          )}
        </div>
      </section>

      <section className={`rounded-[1.9rem] border p-6 ${isDark ? "border-white/10 bg-white/[0.03]" : "border-slate-200 bg-slate-50/80"}`}>
        <div className="flex items-center gap-3">
          <div className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl ${isDark ? "bg-cyan-400/10 text-cyan-300" : "bg-blue-100 text-blue-700"}`}>
            <Archive size={18} />
          </div>
          <div>
            <div className="text-xl font-black">Archived Overview</div>
            <div className={`text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>
              Review the final case record together with patient-wide trends and anomalies.
            </div>
          </div>
        </div>

        {detailLoading ? (
          <div className="flex min-h-[16rem] items-center justify-center">
            <LoaderCircle size={24} className="animate-spin text-cyan-400" />
          </div>
        ) : selectedCase ? (
          <div className="mt-5 space-y-4">
            <div className={`rounded-2xl p-4 ${isDark ? "bg-white/5" : "bg-white"}`}>
              <div className="text-lg font-black">{selectedCase.patient?.full_name || "Patient"}</div>
              <div className={`mt-1 text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                {[selectedCase.patient?.age ? `${selectedCase.patient.age}y` : null, selectedCase.patient?.gender, selectedCase.patient?.blood_group].filter(Boolean).join(" • ") || "Demographics unavailable"}
              </div>
            </div>
            <div className={`rounded-2xl p-4 ${isDark ? "bg-white/5" : "bg-white"}`}>
              <div className="font-bold">Closing Summary</div>
              <div className={`mt-2 text-sm ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                {selectedCase.closing_note || "No closing summary was captured for this case."}
              </div>
            </div>
            <div className={`rounded-2xl p-4 ${isDark ? "bg-white/5" : "bg-white"}`}>
              <div className="font-bold">Patient Trend Summary</div>
              <div className="mt-3 space-y-2">
                {(selectedTrends?.summary || []).slice(0, 4).map((item, index) => (
                  <div key={`${item}-${index}`} className={`rounded-xl px-3 py-2 text-sm ${isDark ? "bg-slate-950/60 text-slate-200" : "bg-slate-50 text-slate-700"}`}>
                    {item}
                  </div>
                ))}
                {!selectedTrends?.summary?.length ? (
                  <div className={`text-sm ${isDark ? "text-slate-500" : "text-slate-400"}`}>No patient-wide summary available.</div>
                ) : null}
              </div>
            </div>
            <div className={`rounded-2xl p-4 ${isDark ? "bg-white/5" : "bg-white"}`}>
              <div className="font-bold">Patient Anomalies</div>
              <div className="mt-3 space-y-2">
                {(selectedTrends?.anomalies || []).slice(0, 5).map((anomaly, index) => (
                  <div key={`${anomaly.parameter}-${index}`} className={`rounded-xl px-3 py-2 text-sm ${anomaly.severity === "critical" ? (isDark ? "bg-red-500/10 text-red-200" : "bg-red-50 text-red-700") : isDark ? "bg-amber-500/10 text-amber-200" : "bg-amber-50 text-amber-700"}`}>
                    {anomaly.message}
                  </div>
                ))}
                {!selectedTrends?.anomalies?.length ? (
                  <div className={`text-sm ${isDark ? "text-slate-500" : "text-slate-400"}`}>No anomalies detected across the patient record.</div>
                ) : null}
              </div>
            </div>
          </div>
        ) : (
          <div className={`mt-5 rounded-2xl border border-dashed px-4 py-12 text-center ${isDark ? "border-white/10 text-slate-500" : "border-slate-200 text-slate-400"}`}>
            Choose an archived case to inspect its final clinical summary.
          </div>
        )}
      </section>
    </div>
  );
}

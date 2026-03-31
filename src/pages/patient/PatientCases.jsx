import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ClipboardPlus, LoaderCircle, MessageSquareHeart, RefreshCcw } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";
import caseService from "../../services/case.service";

function formatDate(value) {
  if (!value) return "Date pending";
  return new Date(value).toLocaleDateString();
}

export default function PatientCases() {
  const { isDark } = useTheme();
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadCases = async () => {
    try {
      const data = await caseService.getCases();
      setCases(data || []);
    } catch (loadError) {
      setError(loadError.message || "Failed to load your cases.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCases();
  }, []);

  const activeCase = useMemo(
    () => cases.find((item) => item.status === "pending" || item.status === "open" || item.status === "in_review") || null,
    [cases]
  );

  const handleRequestConsultation = async () => {
    setRequesting(true);
    setError("");
    setMessage("");
    try {
      await caseService.requestConsultation({ type: "consultation_request" });
      await loadCases();
      setMessage("Consultation request submitted. A doctor will initiate the chat when ready.");
    } catch (requestError) {
      setError(requestError.message || "Failed to request consultation.");
    } finally {
      setRequesting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <LoaderCircle size={28} className="animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 px-4 md:px-0">
      <section className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 className={`text-4xl font-black tracking-tight ${isDark ? "text-white" : "text-slate-900"}`}>Consultation Cases</h1>
          <p className={`mt-2 text-lg ${isDark ? "text-slate-400" : "text-slate-500"}`}>
            Request a consultation, track its status, and move into chat once a doctor starts the case.
          </p>
        </div>
        <button
          type="button"
          onClick={loadCases}
          className={`inline-flex items-center gap-2 rounded-2xl px-4 py-3 font-bold ${
            isDark ? "bg-white/5 text-slate-200 hover:bg-white/10" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
          }`}
        >
          <RefreshCcw size={16} />
          Refresh
        </button>
      </section>

      {message ? (
        <div className={`rounded-2xl px-4 py-3 text-sm font-semibold ${isDark ? "bg-emerald-500/10 text-emerald-300" : "bg-emerald-50 text-emerald-700"}`}>
          {message}
        </div>
      ) : null}
      {error ? (
        <div className={`rounded-2xl px-4 py-3 text-sm font-semibold ${isDark ? "bg-red-500/10 text-red-300" : "bg-red-50 text-red-700"}`}>
          {error}
        </div>
      ) : null}

      {!activeCase ? (
        <section className={`rounded-[2rem] border p-8 ${isDark ? "bg-slate-900 border-white/10" : "bg-white border-slate-100 shadow-lg shadow-slate-100/50"}`}>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className={`rounded-2xl p-4 ${isDark ? "bg-cyan-500/10 text-cyan-300" : "bg-blue-50 text-blue-700"}`}>
                <ClipboardPlus size={28} />
              </div>
              <div>
                <h2 className={`text-2xl font-black ${isDark ? "text-white" : "text-slate-900"}`}>No active case</h2>
                <p className={`mt-2 max-w-2xl ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                  Start a consultation request when you want a doctor to review your reports and open a guided conversation.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleRequestConsultation}
              disabled={requesting}
              className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 font-bold text-white hover:bg-blue-500 transition-colors disabled:opacity-50"
            >
              {requesting ? "Requesting..." : "Request Consultation"}
              <ArrowRight size={16} />
            </button>
          </div>
        </section>
      ) : (
        <section className={`rounded-[2rem] border p-8 ${isDark ? "bg-slate-900 border-white/10" : "bg-white border-slate-100 shadow-lg shadow-slate-100/50"}`}>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="space-y-2">
              <div className={`text-xs font-black uppercase tracking-[0.25em] ${isDark ? "text-slate-500" : "text-slate-400"}`}>Active Case</div>
              <h2 className={`text-2xl font-black ${isDark ? "text-white" : "text-slate-900"}`}>{activeCase.title}</h2>
              <p className={`${isDark ? "text-slate-400" : "text-slate-500"}`}>
                Status: <span className="font-bold capitalize">{activeCase.status}</span> - Opened {formatDate(activeCase.created_at)}
              </p>
              <p className={`${isDark ? "text-slate-300" : "text-slate-600"}`}>{activeCase.description || "Waiting for doctor review."}</p>
            </div>

            <Link to="/patient/chat" className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 font-bold text-white hover:bg-emerald-500 transition-colors">
              <MessageSquareHeart size={16} />
              Open Consultation Chat
            </Link>
          </div>
        </section>
      )}

      <section className={`rounded-[2rem] border p-6 ${isDark ? "bg-slate-900 border-white/10" : "bg-white border-slate-100 shadow-lg shadow-slate-100/50"}`}>
        <h2 className={`text-2xl font-black ${isDark ? "text-white" : "text-slate-900"}`}>Case History</h2>
        <div className="mt-5 space-y-3">
          {cases.length ? (
            cases.map((item) => (
              <div key={item.id} className={`rounded-2xl px-4 py-4 ${isDark ? "bg-white/5" : "bg-slate-50"}`}>
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                  <div>
                    <div className={`font-bold ${isDark ? "text-white" : "text-slate-900"}`}>{item.title}</div>
                    <div className={`text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                      {formatDate(item.created_at)} - <span className="capitalize">{item.status}</span>
                    </div>
                  </div>
                  <Link to="/patient/chat" className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold ${isDark ? "bg-white/5 text-slate-200 hover:bg-white/10" : "bg-white text-slate-700 hover:bg-slate-200"}`}>
                    Open Chat
                    <ArrowRight size={14} />
                  </Link>
                </div>
              </div>
            ))
          ) : (
            <div className={`rounded-2xl border border-dashed px-4 py-8 text-center ${isDark ? "border-white/10 text-slate-500" : "border-slate-200 text-slate-400"}`}>
              No consultation cases yet.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

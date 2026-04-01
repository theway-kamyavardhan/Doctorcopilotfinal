import React, { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, FileSearch, LoaderCircle, MessageSquareHeart, SendHorizonal, ShieldCheck, ShieldQuestion } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { useTheme } from "../../context/ThemeContext";
import caseService from "../../services/case.service";
import useCaseChatStream from "../../hooks/useCaseChatStream";
import {
  getDoctorCase,
  getDoctorCases,
  requestDoctorReportAccess,
} from "../../services/doctor.service";

function formatDateTime(value) {
  if (!value) return "";
  return new Date(value).toLocaleString();
}

function renderMessageContent(message) {
  if (message.message_type === "consultation_started") {
    return (
      <div className="space-y-2">
        <div className="inline-flex items-center gap-2 text-sm font-bold">
          <MessageSquareHeart size={16} />
          Consultation started
        </div>
        <div className="text-sm leading-6 whitespace-pre-wrap">{message.content}</div>
      </div>
    );
  }

  if (message.message_type === "accept_notice") {
    return (
      <div className="space-y-2">
        <div className="inline-flex items-center gap-2 text-sm font-bold">
          <CheckCircle2 size={16} />
          Acceptance sent to patient
        </div>
        <div className="text-sm leading-6 whitespace-pre-wrap">{message.content}</div>
      </div>
    );
  }

  if (message.message_type === "report_access_request") {
    return (
      <div className="space-y-2">
        <div className="inline-flex items-center gap-2 text-sm font-bold">
          <ShieldQuestion size={16} />
          Report access request
        </div>
        <div className="text-sm leading-6 whitespace-pre-wrap">{message.content}</div>
      </div>
    );
  }

  if (message.message_type === "report_access_response") {
    return (
      <div className="space-y-2">
        <div className="inline-flex items-center gap-2 text-sm font-bold">
          <ShieldCheck size={16} />
          Patient response
        </div>
        <div className="text-sm leading-6 whitespace-pre-wrap">{message.content}</div>
      </div>
    );
  }

  return <div className="text-sm leading-6 whitespace-pre-wrap">{message.content}</div>;
}

export default function DoctorChats() {
  const { isDark } = useTheme();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedCaseId = searchParams.get("case");
  const [cases, setCases] = useState([]);
  const [selectedCaseId, setSelectedCaseId] = useState(requestedCaseId || null);
  const [selectedCase, setSelectedCase] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [requestingAccess, setRequestingAccess] = useState(false);
  const [error, setError] = useState("");
  const listRef = useRef(null);

  const loadCases = async () => {
    const caseData = await getDoctorCases();
    const liveCases = (caseData || []).filter((item) => item.status !== "closed" && item.status !== "transferred");
    setCases(liveCases);
    if (!selectedCaseId && liveCases.length) {
      setSelectedCaseId(requestedCaseId || liveCases[0].id);
    }
    return liveCases;
  };

  const loadSelectedCase = async (caseId) => {
    if (!caseId) {
      setSelectedCase(null);
      setMessages([]);
      return;
    }
    const [caseDetail, messageData] = await Promise.all([
      getDoctorCase(caseId),
      caseService.getCaseMessages(caseId),
    ]);
    setSelectedCase(caseDetail);
    setMessages(messageData || []);
    setCases((current) => current.map((item) => (item.id === caseDetail.id ? caseDetail : item)));
  };

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const caseData = await loadCases();
        const targetCaseId = requestedCaseId || caseData?.[0]?.id;
        if (targetCaseId) {
          setSelectedCaseId(targetCaseId);
          await loadSelectedCase(targetCaseId);
        }
      } catch (loadError) {
        setError(loadError.message || "Failed to load doctor chat.");
      } finally {
        setLoading(false);
      }
    };

    bootstrap();
  }, []);

  useEffect(() => {
    if (!selectedCaseId || loading) return;
    setSearchParams(selectedCaseId ? { case: selectedCaseId } : {});
    loadSelectedCase(selectedCaseId).catch((loadError) => {
      setError(loadError.message || "Failed to load case conversation.");
    });
  }, [selectedCaseId, loading, setSearchParams]);

  useCaseChatStream(selectedCaseId, {
    enabled: Boolean(selectedCaseId),
    onMessage: React.useCallback((incoming) => {
      setMessages((current) => {
        const map = new Map(current.map((message) => [message.id, message]));
        map.set(incoming.id, incoming);
        return Array.from(map.values()).sort(
          (left, right) => new Date(left.created_at) - new Date(right.created_at),
        );
      });
      getDoctorCase(selectedCaseId)
        .then((detail) => {
          setSelectedCase(detail);
          setCases((current) => current.map((item) => (item.id === detail.id ? detail : item)));
        })
        .catch(() => {});
    }, [selectedCaseId]),
  });

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages]);

  const chatReady = selectedCase && selectedCase.status !== "pending";
  const accessStatusMeta = useMemo(() => {
    const status = selectedCase?.report_access_status || "not_requested";
    if (status === "granted") {
      return {
        label: "Patient granted report access",
        tone: isDark ? "bg-emerald-500/10 text-emerald-200" : "bg-emerald-50 text-emerald-700",
      };
    }
    if (status === "requested") {
      return {
        label: "Waiting for patient permission",
        tone: isDark ? "bg-amber-500/10 text-amber-200" : "bg-amber-50 text-amber-700",
      };
    }
    if (status === "denied") {
      return {
        label: "Patient denied report access. Consultation is stagnant until you request again.",
        tone: isDark ? "bg-red-500/10 text-red-200" : "bg-red-50 text-red-700",
      };
    }
    return {
      label: "No report access request sent",
      tone: isDark ? "bg-white/5 text-slate-300" : "bg-slate-100 text-slate-600",
    };
  }, [isDark, selectedCase]);

  const handleSend = async (event) => {
    event.preventDefault();
    const content = draft.trim();
    if (!content || !selectedCaseId || sending || !chatReady) return;

    setSending(true);
    setError("");
    try {
      await caseService.sendCaseMessage(selectedCaseId, content);
      setDraft("");
      await loadSelectedCase(selectedCaseId);
    } catch (sendError) {
      setError(sendError.message || "Failed to send message.");
    } finally {
      setSending(false);
    }
  };

  const handleRequestAccess = async () => {
    if (!selectedCaseId) return;
    setRequestingAccess(true);
    setError("");
    try {
      await requestDoctorReportAccess(selectedCaseId);
      await loadSelectedCase(selectedCaseId);
    } catch (requestError) {
      setError(requestError.message || "Failed to request report access.");
    } finally {
      setRequestingAccess(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <LoaderCircle size={28} className="animate-spin text-cyan-400" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 px-4 md:px-0">
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className={`text-[11px] font-black uppercase tracking-[0.24em] ${isDark ? "text-cyan-200/75" : "text-blue-700/75"}`}>
            Chats
          </div>
          <h1 className={`mt-2 text-4xl font-black tracking-tight ${isDark ? "text-white" : "text-slate-900"}`}>Doctor Consultation Chat</h1>
          <p className={`mt-2 text-base ${isDark ? "text-slate-400" : "text-slate-500"}`}>
            Review live conversations, request report access, and continue active consultations from one place.
          </p>
        </div>
      </section>

      {error ? (
        <div className={`rounded-2xl px-4 py-3 text-sm font-semibold ${isDark ? "bg-red-500/10 text-red-300" : "bg-red-50 text-red-700"}`}>
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-1 xl:grid-cols-[320px_1fr] gap-6">
        <aside className={`rounded-[2rem] border p-4 ${isDark ? "border-white/10 bg-white/[0.03]" : "border-slate-200 bg-slate-50/80"}`}>
          <div className={`px-3 py-2 text-xs font-black uppercase tracking-[0.24em] ${isDark ? "text-slate-500" : "text-slate-400"}`}>Case Threads</div>
          <div className="mt-3 space-y-2">
            {cases.length ? (
              cases.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedCaseId(item.id)}
                  className={`w-full rounded-2xl px-4 py-4 text-left transition-colors ${
                    selectedCaseId === item.id
                      ? isDark
                        ? "bg-cyan-500/10 text-white"
                        : "bg-blue-50 text-slate-900"
                      : isDark
                        ? "bg-white/5 text-slate-300 hover:bg-white/10"
                        : "bg-white text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <div className="font-bold">{item.patient?.full_name || item.patient_name || item.title}</div>
                  <div className="mt-1 text-sm opacity-70 capitalize">{item.status}</div>
                  <div className={`mt-1 text-xs ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                    {item.latest_message_preview || item.description || "No messages yet"}
                  </div>
                </button>
              ))
            ) : (
              <div className={`rounded-2xl px-4 py-6 text-sm ${isDark ? "bg-white/5 text-slate-500" : "bg-slate-50 text-slate-400"}`}>
                No doctor conversations are available yet.
              </div>
            )}
          </div>
        </aside>

        <section className={`rounded-[2rem] border ${isDark ? "border-white/10 bg-white/[0.03]" : "border-slate-200 bg-white"} flex flex-col min-h-[72vh]`}>
          <div className={`border-b px-6 py-5 ${isDark ? "border-white/10" : "border-slate-100"}`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className={`text-2xl font-black ${isDark ? "text-white" : "text-slate-900"}`}>{selectedCase?.patient?.full_name || "Select a case"}</h2>
                <p className={`mt-1 text-sm capitalize ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                  {selectedCase ? `${selectedCase.status} consultation • ${selectedCase.title}` : "Choose an active case thread"}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {selectedCase ? (
                  <>
                    <div className={`rounded-full px-3 py-1 text-xs font-bold ${accessStatusMeta.tone}`}>{accessStatusMeta.label}</div>
                    <button
                      type="button"
                      onClick={handleRequestAccess}
                      disabled={!chatReady || requestingAccess || selectedCase.report_access_status === "requested"}
                      className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold transition-colors ${
                        isDark ? "bg-white/8 text-slate-100 hover:bg-white/12" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                      } disabled:opacity-60`}
                    >
                      <FileSearch size={14} />
                      {selectedCase.report_access_status === "denied" ? "Request Again" : "Request Report Access"}
                    </button>
                  </>
                ) : null}
              </div>
            </div>
          </div>

          {!chatReady ? (
            <div className="flex flex-1 items-center justify-center px-6">
              <div className="max-w-xl text-center">
                <div className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl ${isDark ? "bg-amber-500/10 text-amber-300" : "bg-amber-50 text-amber-700"}`}>
                  <ShieldQuestion size={28} />
                </div>
                <h3 className={`text-2xl font-black ${isDark ? "text-white" : "text-slate-900"}`}>Accept the consultation before chatting</h3>
                <p className={`mt-3 leading-7 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                  Pending patient requests stay read-only here. Accept the case from the cases queue, then the full chat workspace opens automatically.
                </p>
              </div>
            </div>
          ) : (
            <div ref={listRef} className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              {messages.map((message) => {
                const mine = message.sender_type === "doctor";
                const special = message.message_type !== "text";
                return (
                  <div key={message.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[82%] rounded-[1.6rem] px-4 py-3 shadow-sm ${
                      special
                        ? isDark
                          ? "bg-slate-950 text-slate-100 ring-1 ring-white/10"
                          : "bg-slate-50 text-slate-800 ring-1 ring-slate-200"
                        : mine
                          ? "bg-blue-600 text-white rounded-br-md"
                          : isDark
                            ? "bg-white/8 text-slate-100 rounded-bl-md"
                            : "bg-slate-100 text-slate-800 rounded-bl-md"
                    }`}>
                      {renderMessageContent(message)}
                      <div className={`mt-2 text-[11px] ${mine ? "text-blue-100/80" : isDark ? "text-slate-400" : "text-slate-500"}`}>
                        {message.sender_type} • {formatDateTime(message.created_at)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <form onSubmit={handleSend} className={`border-t px-6 py-5 ${isDark ? "border-white/10" : "border-slate-100"}`}>
            <div className="flex items-center gap-3">
              <div className={`flex-1 rounded-[1.5rem] border px-4 py-3 ${isDark ? "bg-white/5 border-white/10" : "bg-slate-50 border-slate-200"}`}>
                <input
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  disabled={!chatReady || sending}
                  placeholder={chatReady ? "Type your message..." : "Chat unlocks after the case is accepted"}
                  className={`w-full bg-transparent outline-none ${isDark ? "text-white placeholder:text-slate-500" : "text-slate-900 placeholder:text-slate-400"} disabled:cursor-not-allowed`}
                />
              </div>
              <button
                type="submit"
                disabled={!chatReady || sending || !draft.trim()}
                className="inline-flex items-center gap-2 rounded-[1.5rem] bg-blue-600 px-5 py-3 font-bold text-white hover:bg-blue-500 transition-colors disabled:opacity-50"
              >
                {sending ? <LoaderCircle size={16} className="animate-spin" /> : <SendHorizonal size={16} />}
                Send
              </button>
            </div>
            {selectedCase?.report_access_status === "denied" ? (
              <div className={`mt-3 text-sm ${isDark ? "text-amber-300" : "text-amber-700"}`}>
                Report review is paused. Send another access request when the patient is ready.
              </div>
            ) : null}
          </form>
        </section>
      </div>
    </div>
  );
}

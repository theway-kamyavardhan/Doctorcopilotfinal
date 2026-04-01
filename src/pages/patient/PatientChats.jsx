import React, { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, LoaderCircle, Lock, MessageCircleHeart, SendHorizonal, ShieldQuestion, XCircle } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";
import caseService from "../../services/case.service";
import useCaseChatStream from "../../hooks/useCaseChatStream";

function formatDateTime(value) {
  if (!value) return "";
  return new Date(value).toLocaleString();
}

export default function PatientChats() {
  const { isDark } = useTheme();
  const [cases, setCases] = useState([]);
  const [selectedCase, setSelectedCase] = useState(null);
  const [selectedCaseId, setSelectedCaseId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [respondingAccess, setRespondingAccess] = useState(false);
  const [error, setError] = useState("");
  const listRef = useRef(null);

  const loadCases = async () => {
    const caseData = await caseService.getCases();
    setCases(caseData || []);
    if (!selectedCaseId && caseData?.length) {
      setSelectedCaseId(caseData[0].id);
    }
    return caseData || [];
  };

  const loadMessages = async (caseId) => {
    if (!caseId) {
      setMessages([]);
      return;
    }
    const messageData = await caseService.getCaseMessages(caseId);
    setMessages(messageData || []);
  };

  const loadCaseDetails = async (caseId) => {
    if (!caseId) {
      setSelectedCase(null);
      return;
    }
    const detail = await caseService.getCaseDetails(caseId);
    setSelectedCase(detail);
    setCases((current) => current.map((item) => (item.id === detail.id ? detail : item)));
  };

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const caseData = await loadCases();
        if (caseData?.[0]?.id) {
          await loadCaseDetails(caseData[0].id);
          await loadMessages(caseData[0].id);
        }
      } catch (loadError) {
        setError(loadError.message || "Failed to load consultation chat.");
      } finally {
        setLoading(false);
      }
    };

    bootstrap();
  }, []);

  useEffect(() => {
    if (!selectedCaseId || loading) return;
    Promise.all([loadCaseDetails(selectedCaseId), loadMessages(selectedCaseId)]).catch((loadError) => {
      setError(loadError.message || "Failed to load consultation chat.");
    });
  }, [selectedCaseId, loading]);

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
      loadCaseDetails(selectedCaseId).catch(() => {});
    }, [selectedCaseId]),
  });

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages]);

  const selectedCaseSummary = useMemo(() => cases.find((item) => item.id === selectedCaseId) || null, [cases, selectedCaseId]);
  const doctorStarted = useMemo(() => messages.some((message) => message.sender_type === "doctor"), [messages]);
  const latestReportAccessRequest = useMemo(
    () =>
      [...messages]
        .reverse()
        .find((message) => message.message_type === "report_access_request"),
    [messages],
  );

  const accessStatusMeta = useMemo(() => {
    const status = selectedCase?.report_access_status || "not_requested";
    if (status === "granted") {
      return {
        label: "Reports shared with doctor",
        tone: isDark ? "bg-emerald-500/10 text-emerald-200" : "bg-emerald-50 text-emerald-700",
      };
    }
    if (status === "requested") {
      return {
        label: "Doctor requested access to your reports",
        tone: isDark ? "bg-amber-500/10 text-amber-200" : "bg-amber-50 text-amber-700",
      };
    }
    if (status === "denied") {
      return {
        label: "Report access denied. Consultation is waiting for the doctor to request again.",
        tone: isDark ? "bg-red-500/10 text-red-200" : "bg-red-50 text-red-700",
      };
    }
    return {
      label: "No report access request yet",
      tone: isDark ? "bg-white/5 text-slate-300" : "bg-slate-100 text-slate-600",
    };
  }, [isDark, selectedCase]);

  const handleSend = async (event) => {
    event.preventDefault();
    const content = draft.trim();
    if (!content || !selectedCaseId || sending || !doctorStarted) return;

    setSending(true);
    setError("");
    try {
      await caseService.sendCaseMessage(selectedCaseId, content);
      setDraft("");
      await loadMessages(selectedCaseId);
    } catch (sendError) {
      setError(sendError.message || "Failed to send message.");
    } finally {
      setSending(false);
    }
  };

  const handleReportAccessDecision = async (decision) => {
    if (!selectedCaseId || selectedCase?.report_access_status !== "requested") return;
    setRespondingAccess(true);
    setError("");
    try {
      await caseService.respondReportAccess(selectedCaseId, decision);
      await Promise.all([loadCaseDetails(selectedCaseId), loadMessages(selectedCaseId)]);
    } catch (respondError) {
      setError(respondError.message || "Failed to submit report access response.");
    } finally {
      setRespondingAccess(false);
    }
  };

  const renderMessageBody = (message) => {
    if (message.message_type === "accept_notice") {
      return (
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 text-sm font-bold">
            <CheckCircle2 size={16} />
            Consultation accepted
          </div>
          <div className="text-sm leading-6 whitespace-pre-wrap">{message.content}</div>
        </div>
      );
    }

    if (message.message_type === "consultation_started") {
      return (
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 text-sm font-bold">
            <MessageCircleHeart size={16} />
            Consultation started
          </div>
          <div className="text-sm leading-6 whitespace-pre-wrap">{message.content}</div>
        </div>
      );
    }

    if (message.message_type === "report_access_request") {
      const actionable =
        latestReportAccessRequest?.id === message.id && selectedCase?.report_access_status === "requested";
      return (
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 text-sm font-bold">
            <ShieldQuestion size={16} />
            Report access request
          </div>
          <div className="text-sm leading-6 whitespace-pre-wrap">{message.content}</div>
          {actionable ? (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => handleReportAccessDecision("granted")}
                disabled={respondingAccess}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-emerald-500 disabled:opacity-60"
              >
                <CheckCircle2 size={14} />
                Yes, allow access
              </button>
              <button
                type="button"
                onClick={() => handleReportAccessDecision("denied")}
                disabled={respondingAccess}
                className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold ${
                  isDark ? "bg-red-500/10 text-red-200 hover:bg-red-500/15" : "bg-red-50 text-red-700 hover:bg-red-100"
                } disabled:opacity-60`}
              >
                <XCircle size={14} />
                No, deny access
              </button>
            </div>
          ) : null}
        </div>
      );
    }

    if (message.message_type === "report_access_response") {
      return (
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 text-sm font-bold">
            <ShieldQuestion size={16} />
            Report access update
          </div>
          <div className="text-sm leading-6 whitespace-pre-wrap">{message.content}</div>
        </div>
      );
    }

    return <div className="text-sm leading-6 whitespace-pre-wrap">{message.content}</div>;
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <LoaderCircle size={28} className="animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 px-4 md:px-0">
      <section>
        <h1 className={`text-4xl font-black tracking-tight ${isDark ? "text-white" : "text-slate-900"}`}>Consultation Chat</h1>
        <p className={`mt-2 text-lg ${isDark ? "text-slate-400" : "text-slate-500"}`}>
          Doctor-initiated chat opens here once your consultation request is picked up.
        </p>
      </section>

      {error ? (
        <div className={`rounded-2xl px-4 py-3 text-sm font-semibold ${isDark ? "bg-red-500/10 text-red-300" : "bg-red-50 text-red-700"}`}>
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-1 xl:grid-cols-[320px_1fr] gap-6">
        <aside className={`rounded-[2rem] border p-4 ${isDark ? "bg-slate-900 border-white/10" : "bg-white border-slate-100 shadow-lg shadow-slate-100/50"}`}>
          <div className={`px-3 py-2 text-xs font-black uppercase tracking-[0.24em] ${isDark ? "text-slate-500" : "text-slate-400"}`}>Your Cases</div>
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
                        : "bg-slate-50 text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <div className="font-bold">{item.title}</div>
                  <div className="mt-1 text-sm opacity-70 capitalize">{item.status}</div>
                </button>
              ))
            ) : (
              <div className={`rounded-2xl px-4 py-6 text-sm ${isDark ? "bg-white/5 text-slate-500" : "bg-slate-50 text-slate-400"}`}>
                No consultation cases available yet.
              </div>
            )}
          </div>
        </aside>

        <section className={`rounded-[2rem] border ${isDark ? "bg-slate-900 border-white/10" : "bg-white border-slate-100 shadow-lg shadow-slate-100/50"} flex flex-col min-h-[70vh]`}>
          <div className={`flex items-center justify-between border-b px-6 py-5 ${isDark ? "border-white/10" : "border-slate-100"}`}>
            <div>
              <h2 className={`text-2xl font-black ${isDark ? "text-white" : "text-slate-900"}`}>{selectedCase?.title || selectedCaseSummary?.title || "Select a case"}</h2>
              <p className={`${isDark ? "text-slate-400" : "text-slate-500"} text-sm mt-1 capitalize`}>
                {selectedCase ? `${selectedCase.status} consultation` : selectedCaseSummary ? `${selectedCaseSummary.status} consultation` : "Choose a consultation thread"}
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <div className={`rounded-full px-3 py-1 text-xs font-bold ${doctorStarted ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-500/10 text-amber-500"}`}>
                {doctorStarted ? "Doctor connected" : "Waiting for doctor"}
              </div>
              {selectedCase ? (
                <div className={`rounded-full px-3 py-1 text-xs font-bold ${accessStatusMeta.tone}`}>{accessStatusMeta.label}</div>
              ) : null}
            </div>
          </div>

          {!doctorStarted ? (
            <div className="flex-1 flex items-center justify-center px-6">
              <div className="max-w-lg text-center">
                <div className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl ${isDark ? "bg-amber-500/10 text-amber-300" : "bg-amber-50 text-amber-700"}`}>
                  <Lock size={28} />
                </div>
                <h3 className={`text-2xl font-black ${isDark ? "text-white" : "text-slate-900"}`}>Waiting for doctor to start consultation</h3>
                <p className={`mt-3 leading-7 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                  As soon as a doctor sends the first message, this chat opens for patient replies. Until then the thread stays read-only.
                </p>
              </div>
            </div>
          ) : (
            <div ref={listRef} className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              {messages.map((message) => {
                const mine = message.sender_type === "patient";
                const specialMessage = message.message_type !== "text";
                return (
                  <div key={message.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[82%] rounded-[1.6rem] px-4 py-3 shadow-sm ${specialMessage ? isDark ? "bg-slate-950 text-slate-100 ring-1 ring-white/10" : "bg-white text-slate-800 ring-1 ring-slate-200" : mine ? "bg-blue-600 text-white rounded-br-md" : isDark ? "bg-white/8 text-slate-100 rounded-bl-md" : "bg-slate-100 text-slate-800 rounded-bl-md"}`}>
                      {renderMessageBody(message)}
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
                  disabled={!doctorStarted || !selectedCaseId || sending}
                  placeholder={doctorStarted ? "Type your message..." : "Input unlocks after doctor sends the first message"}
                  className={`w-full bg-transparent outline-none ${isDark ? "text-white placeholder:text-slate-500" : "text-slate-900 placeholder:text-slate-400"} disabled:cursor-not-allowed`}
                />
              </div>
              <button type="submit" disabled={!doctorStarted || !selectedCaseId || sending || !draft.trim()} className="inline-flex items-center gap-2 rounded-[1.5rem] bg-blue-600 px-5 py-3 font-bold text-white hover:bg-blue-500 transition-colors disabled:opacity-50">
                {sending ? <LoaderCircle size={16} className="animate-spin" /> : <SendHorizonal size={16} />}
                Send
              </button>
            </div>
            {!selectedCaseId ? (
              <div className={`mt-3 flex items-center gap-2 text-sm ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                <MessageCircleHeart size={14} />
                Create or select a consultation case to view chat history.
              </div>
            ) : selectedCase?.report_access_status === "requested" ? (
              <div className={`mt-3 text-sm ${isDark ? "text-amber-300" : "text-amber-700"}`}>
                The doctor is waiting for your response to the report access request shown in chat.
              </div>
            ) : selectedCase?.report_access_status === "denied" ? (
              <div className={`mt-3 text-sm ${isDark ? "text-red-300" : "text-red-700"}`}>
                Report access is currently denied. The doctor can request permission again at any time.
              </div>
            ) : null}
          </form>
        </section>
      </div>
    </div>
  );
}

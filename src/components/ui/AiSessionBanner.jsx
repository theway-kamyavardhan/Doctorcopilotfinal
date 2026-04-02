import { useEffect, useState } from "react";
import { KeyRound, LockOpen, ShieldAlert } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../../context/ThemeContext";
import { authService } from "../../services/auth.service";
import systemService from "../../services/system.service";

export default function AiSessionBanner() {
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [sessionKey, setSessionKey] = useState(systemService.readSessionApiKey() || "");
  const [feedback, setFeedback] = useState("");
  const [saving, setSaving] = useState(false);

  const loadStatus = async () => {
    try {
      const next = await systemService.getAiAccessStatus();
      setStatus(next);
    } catch {
      setStatus(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  if (loading || !status?.demo_mode) {
    return null;
  }

  const handleSave = async () => {
    setSaving(true);
    setFeedback("");
    try {
      systemService.saveSessionApiKey(sessionKey);
      await systemService.validateSessionApiKey();
      setFeedback("Your API key is kept only in this browser session, is not stored in the database, and will be removed automatically when you log out.");
      await loadStatus();
      setShowForm(false);
    } catch (error) {
      systemService.removeSessionApiKey();
      setFeedback(error.message || "Unable to validate that API key for this session.");
    } finally {
      setSaving(false);
    }
  };

  const handleClear = async () => {
    systemService.removeSessionApiKey();
    setSessionKey("");
    setFeedback("Session API key removed. The project is back in demo mode.");
    await loadStatus();
  };

  const handleCreateProfile = () => {
    authService.logout();
    navigate("/register/patient", { replace: true });
  };

  return (
    <div
      className={`mb-4 rounded-[1.6rem] border px-4 py-4 sm:px-5 ${
        isDark ? "border-amber-500/25 bg-amber-500/10 text-amber-50" : "border-amber-200 bg-amber-50 text-amber-900"
      }`}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-3">
          <div className={`mt-0.5 rounded-2xl p-2 ${isDark ? "bg-amber-400/15" : "bg-amber-100"}`}>
            <ShieldAlert size={18} />
          </div>
          <div>
            <div className="text-[11px] font-black uppercase tracking-[0.22em]">Demo Mode</div>
            <p className="mt-2 max-w-3xl text-sm leading-6">{status.message}</p>
            <p className="mt-2 max-w-3xl text-xs leading-6 opacity-85">
              If you use your own API key, it stays only in this current browser session, is never stored in our database, and is removed automatically on logout. Your reports can still be deleted later from Reports or by clearing all patient data in Settings.
            </p>
            {feedback ? <p className="mt-2 text-xs font-semibold opacity-80">{feedback}</p> : null}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {status.demo_account_restricted ? (
            <button
              type="button"
              onClick={handleCreateProfile}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold ${
                isDark ? "bg-white/10 text-white hover:bg-white/15" : "bg-white text-slate-800 hover:bg-slate-100"
              }`}
            >
              <KeyRound size={15} />
              Create Your Own Profile
            </button>
          ) : !status.session_key_supported ? (
            <div
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold ${
                isDark ? "bg-white/10 text-white" : "bg-white text-slate-700"
              }`}
            >
              <ShieldAlert size={15} />
              Personal API Key Disabled
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowForm((open) => !open)}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold ${
                isDark ? "bg-white/10 text-white hover:bg-white/15" : "bg-white text-slate-800 hover:bg-slate-100"
              }`}
            >
              <KeyRound size={15} />
              Use My API Key
            </button>
          )}
          {systemService.readSessionApiKey() ? (
            <button
              type="button"
              onClick={handleClear}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold ${
                isDark ? "bg-white/5 text-slate-100 hover:bg-white/10" : "bg-amber-100 text-amber-900 hover:bg-amber-200"
              }`}
            >
              <LockOpen size={15} />
              Clear Session Key
            </button>
          ) : null}
        </div>
      </div>

      {showForm && !status.demo_account_restricted && status.session_key_supported ? (
        <div className="mt-4 flex flex-col gap-3 md:flex-row">
          <input
            type="password"
            value={sessionKey}
            onChange={(event) => setSessionKey(event.target.value)}
            placeholder="Paste your OpenAI API key for this session"
            className={`flex-1 rounded-2xl border px-4 py-3 text-sm outline-none ${
              isDark
                ? "border-white/10 bg-slate-950/60 text-white placeholder:text-slate-500"
                : "border-amber-200 bg-white text-slate-900 placeholder:text-slate-400"
            }`}
          />
          <button
            type="button"
            onClick={handleSave}
            disabled={!sessionKey.trim() || saving}
            className="rounded-2xl bg-blue-600 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-blue-500 disabled:opacity-50"
          >
            {saving ? "Securing Key..." : "Save For Session"}
          </button>
        </div>
      ) : null}
    </div>
  );
}

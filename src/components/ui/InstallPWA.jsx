import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, X, Share, Plus, Smartphone } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";
import usePWA from "../../hooks/usePWA";

const STORAGE_KEY = "dc_pwa_install_dismissed";
const DISMISS_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function wasDismissedRecently() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return false;
    const { dismissedAt } = JSON.parse(stored);
    return Date.now() - dismissedAt < DISMISS_DURATION_MS;
  } catch {
    return false;
  }
}

export default function InstallPWA() {
  const { isDark } = useTheme();
  const { isInstallable, promptInstall, isInstalled, isIOS: isIOSDevice } = usePWA();
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // Already installed — don't show
    if (isInstalled) return;
    // Was dismissed recently — don't show
    if (wasDismissedRecently()) return;

    if (isIOSDevice) {
      // iOS: always show guide after a short delay
      const t = setTimeout(() => setShowBanner(true), 3000);
      return () => clearTimeout(t);
    }

    if (isInstallable) {
      setTimeout(() => setShowBanner(true), 2000);
    }
  }, [isInstalled, isIOSDevice, isInstallable]);

  const handleInstall = useCallback(async () => {
    const success = await promptInstall();
    if (success) {
      setShowBanner(false);
    }
  }, [promptInstall]);

  const handleDismiss = useCallback(() => {
    setShowBanner(false);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ dismissedAt: Date.now() }));
    } catch {}
  }, []);

  return (
    <AnimatePresence>
      {showBanner && !isInstalled && (
        <motion.div
          initial={{ opacity: 0, y: 100, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 80, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 340, damping: 30 }}
          className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] left-3 right-3 z-[200] sm:bottom-6 sm:left-auto sm:right-6 sm:max-w-sm"
        >
          <div
            className={`relative overflow-hidden rounded-3xl border backdrop-blur-2xl backdrop-saturate-150 p-4 shadow-2xl ${
              isDark
                ? "border-white/10 bg-slate-900/80 text-white shadow-[0_20px_60px_rgba(0,0,0,0.6)]"
                : "border-white/60 bg-white/85 text-slate-900 shadow-[0_20px_60px_rgba(15,23,42,0.18)]"
            }`}
          >
            {/* Gradient accent top */}
            <div
              className="absolute inset-x-0 top-0 h-px"
              style={{
                background: isDark
                  ? "linear-gradient(90deg, transparent, rgba(6,182,212,0.8), transparent)"
                  : "linear-gradient(90deg, transparent, rgba(99,102,241,0.6), transparent)",
              }}
            />

            <div className="flex items-start gap-3">
              {/* Icon */}
              <div
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
                  isDark
                    ? "bg-gradient-to-tr from-cyan-600/30 to-blue-600/30 border border-cyan-500/20"
                    : "bg-gradient-to-tr from-blue-100 to-violet-100 border border-blue-200/60"
                }`}
              >
                <Smartphone
                  size={22}
                  className={isDark ? "text-cyan-400" : "text-blue-600"}
                />
              </div>

              <div className="min-w-0 flex-1">
                <p
                  className={`text-sm font-black tracking-tight ${
                    isDark ? "text-white" : "text-slate-900"
                  }`}
                >
                  Install DoctorCopilot
                </p>
                {isIOSDevice ? (
                  <p
                    className={`mt-0.5 text-xs leading-relaxed ${
                      isDark ? "text-slate-400" : "text-slate-500"
                    }`}
                  >
                    Tap{" "}
                    <Share
                      size={12}
                      className="inline-block align-text-bottom"
                    />{" "}
                    then{" "}
                    <strong className={isDark ? "text-cyan-400" : "text-blue-600"}>
                      Add to Home Screen
                    </strong>{" "}
                    for the full app experience.
                  </p>
                ) : (
                  <p
                    className={`mt-0.5 text-xs leading-relaxed ${
                      isDark ? "text-slate-400" : "text-slate-500"
                    }`}
                  >
                    Add to your home screen for offline access & a native app feel.
                  </p>
                )}
              </div>

              {/* Dismiss */}
              <button
                type="button"
                onClick={handleDismiss}
                className={`shrink-0 rounded-full p-1.5 transition-colors ${
                  isDark
                    ? "text-slate-500 hover:bg-white/10 hover:text-slate-300"
                    : "text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                }`}
                aria-label="Dismiss install prompt"
              >
                <X size={14} />
              </button>
            </div>

            {/* Action Buttons */}
            <div className="mt-3 flex items-center gap-2">
              {!isIOSDevice && deferredPrompt && (
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  type="button"
                  onClick={handleInstall}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-2xl py-2.5 text-xs font-bold transition-all ${
                    isDark
                      ? "bg-gradient-to-r from-cyan-600/90 to-blue-600/90 text-white shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:shadow-[0_0_30px_rgba(6,182,212,0.5)]"
                      : "bg-gradient-to-r from-blue-600 to-violet-600 text-white shadow-[0_4px_12px_rgba(99,102,241,0.4)]"
                  }`}
                >
                  <Download size={14} />
                  Install App
                </motion.button>
              )}

              {isIOSDevice && (
                <div
                  className={`flex flex-1 items-center justify-center gap-2 rounded-2xl py-2.5 text-xs font-bold ${
                    isDark
                      ? "bg-white/5 text-slate-300"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  <Plus size={14} />
                  Add to Home Screen
                </div>
              )}

              <button
                type="button"
                onClick={handleDismiss}
                className={`rounded-2xl px-3 py-2.5 text-xs font-bold transition-colors ${
                  isDark
                    ? "text-slate-500 hover:bg-white/5 hover:text-slate-400"
                    : "text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                }`}
              >
                Later
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

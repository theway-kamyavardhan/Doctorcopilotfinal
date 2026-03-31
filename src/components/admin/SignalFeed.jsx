import React, { useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, CheckCircle2, Cpu, ShieldAlert } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";
import { getAdminTheme } from "./adminTheme";

function getSignalTone(level = "info", isDark) {
  const normalized = String(level || "").toLowerCase();
  
  if (normalized.includes("critical") || normalized.includes("error") || normalized.includes("failed")) {
    return {
      strip: "bg-rose-500",
      icon: ShieldAlert,
      card: isDark 
        ? "border-rose-400/20 bg-rose-500/10 text-rose-50 shadow-[0_12px_30px_rgba(244,63,94,0.12)]"
        : "border-rose-200 bg-rose-50 text-rose-900 shadow-[0_4px_20px_rgba(244,63,94,0.06)]",
      subtle: isDark ? "text-rose-200/80" : "text-rose-800/80",
    };
  }
  
  if (normalized.includes("warning") || normalized.includes("pending") || normalized.includes("processing")) {
    return {
      strip: "bg-amber-500",
      icon: AlertTriangle,
      card: isDark 
        ? "border-amber-400/20 bg-amber-500/10 text-amber-50 shadow-[0_12px_30px_rgba(245,158,11,0.12)]"
        : "border-amber-200 bg-amber-50 text-amber-900 shadow-[0_4px_20px_rgba(245,158,11,0.06)]",
      subtle: isDark ? "text-amber-100/80" : "text-amber-800/80",
    };
  }
  
  return {
    strip: "bg-emerald-500",
    icon: CheckCircle2,
    card: isDark 
      ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-50 shadow-[0_12px_30px_rgba(16,185,129,0.12)]"
      : "border-emerald-200 bg-emerald-50 text-emerald-900 shadow-[0_4px_20px_rgba(16,185,129,0.06)]",
    subtle: isDark ? "text-emerald-100/80" : "text-emerald-800/80",
  };
}

export default function SignalFeed({ items = [], aiState }) {
  const { isDark } = useTheme();
  const theme = getAdminTheme(isDark);
  const containerRef = useRef(null);

  const signals = useMemo(() => {
    const base = [
      {
        id: "ai-core-state",
        title: "AI core telemetry",
        message: `Inference engine is ${String(aiState || "unknown").replaceAll("_", " ")}.`,
        level:
          aiState === "ready"
            ? "success"
            : aiState === "busy" || aiState === "processing"
              ? "warning"
              : "critical",
        time: "live",
      },
      ...items,
    ];
    return base.slice(0, 10);
  }, [items, aiState]);

  useEffect(() => {
    if (!containerRef.current) return;
    containerRef.current.scrollTo({
      top: containerRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [signals]);

  return (
    <section className={`${theme.surfaceMuted} p-5`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className={theme.eyebrow}>Live Signal Stream</div>
          <h3 className={`mt-2 text-2xl font-bold tracking-tight ${theme.title}`}>Realtime Event Feed</h3>
        </div>
        <div className={`rounded-full border p-3 ${isDark ? "border-cyan-400/20 bg-cyan-500/10 text-cyan-100 shadow-[0_0_24px_rgba(34,211,238,0.12)]" : "border-slate-200 bg-slate-50 text-slate-500 shadow-sm"}`}>
          <Cpu size={18} />
        </div>
      </div>

      <div ref={containerRef} className="mt-5 max-h-[34rem] space-y-3 overflow-y-auto pr-1">
        <AnimatePresence initial={false}>
          {signals.map((item, index) => {
            const tone = getSignalTone(item.level, isDark);
            const Icon = tone.icon;

            return (
              <motion.div
                key={item.id || `${item.title}-${index}`}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.24, delay: index * 0.04 }}
                className={`group relative overflow-hidden rounded-[1.5rem] border ${tone.card} transition-all duration-300 hover:scale-[1.015]`}
              >
                <div className={`absolute inset-y-0 left-0 w-1.5 ${tone.strip}`} />
                <div className="flex gap-3 px-4 py-4 pl-5">
                  <div className={`mt-0.5 rounded-xl border p-2 ${isDark ? "border-white/10 bg-black/10" : "border-slate-200/50 bg-white/50"}`}>
                    <Icon size={16} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div className="font-bold tracking-tight">{item.title}</div>
                      <div className={`text-[11px] font-black uppercase tracking-[0.2em] ${tone.subtle}`}>
                        {item.time || "live"}
                      </div>
                    </div>
                    <div className={`mt-2 text-sm leading-6 ${tone.subtle}`}>{item.message}</div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </section>
  );
}

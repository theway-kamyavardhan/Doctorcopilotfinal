import React from "react";
import { motion } from "framer-motion";

function getCoreTone(systemHealth = "healthy") {
  const normalized = String(systemHealth || "").toLowerCase();
  if (normalized.includes("critical")) {
    return {
      ring: "from-rose-400/70 via-red-400/25 to-transparent",
      glow: "shadow-[0_0_90px_rgba(244,63,94,0.28)]",
      accent: "text-rose-200",
      sub: "border-rose-400/20 bg-rose-500/10 text-rose-100",
    };
  }
  if (normalized.includes("degraded") || normalized.includes("processing")) {
    return {
      ring: "from-amber-300/70 via-orange-400/25 to-transparent",
      glow: "shadow-[0_0_90px_rgba(251,191,36,0.22)]",
      accent: "text-amber-100",
      sub: "border-amber-400/20 bg-amber-500/10 text-amber-50",
    };
  }
  return {
    ring: "from-cyan-300/70 via-emerald-300/25 to-transparent",
    glow: "shadow-[0_0_90px_rgba(34,211,238,0.22)]",
    accent: "text-cyan-100",
    sub: "border-cyan-400/20 bg-cyan-500/10 text-cyan-50",
  };
}

function MetricPill({ label, value }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-xl">
      <div className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-500">{label}</div>
      <div className="mt-2 text-xl font-black text-white">{value}</div>
    </div>
  );
}

export default function SystemCore({
  systemHealth,
  backendStatus,
  aiState,
  latencyMs,
  activeCases,
  reportsProcessed,
  totalPatients,
}) {
  const tone = getCoreTone(systemHealth);

  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))] p-6 backdrop-blur-xl shadow-[0_28px_100px_rgba(0,0,0,0.45)]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(34,211,238,0.12),_transparent_46%)]" />

      <div className="relative">
        <div className="text-[11px] font-black uppercase tracking-[0.3em] text-cyan-300/90">System Core</div>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h2 className="text-3xl font-black tracking-tight text-white">DoctorCopilot AI Core</h2>
          <span className={`rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] ${tone.sub}`}>
            {String(systemHealth || "unknown")}
          </span>
        </div>

        <div className="mt-8 flex justify-center">
          <div className="relative h-72 w-72">
            <motion.div
              className={`absolute inset-0 rounded-full bg-gradient-to-br ${tone.ring} blur-2xl ${tone.glow}`}
              animate={{ scale: [0.92, 1.06, 0.92], opacity: [0.55, 0.95, 0.55] }}
              transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div
              className="absolute inset-5 rounded-full border border-white/10 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.12),rgba(2,6,23,0.86)_62%)] backdrop-blur-xl"
              animate={{ scale: [1, 1.08, 1] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div
              className="absolute inset-10 rounded-full border border-cyan-300/20 bg-[radial-gradient(circle_at_center,rgba(34,211,238,0.18),rgba(2,6,23,0.9)_68%)]"
              animate={{ rotate: [0, 360] }}
              transition={{ duration: 16, repeat: Infinity, ease: "linear" }}
            />
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <div className="text-[11px] font-black uppercase tracking-[0.26em] text-slate-500">AI Integrity</div>
              <div className={`mt-4 text-5xl font-black tracking-tight ${tone.accent}`}>
                {String(systemHealth || "unknown").toUpperCase()}
              </div>
              <div className="mt-3 max-w-[11rem] text-sm leading-6 text-slate-400">
                Backend {backendStatus || "unknown"}, AI {aiState || "unknown"}.
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricPill label="Latency" value={`${latencyMs ?? "--"} ms`} />
          <MetricPill label="Active Cases" value={activeCases ?? 0} />
          <MetricPill label="Reports" value={reportsProcessed ?? 0} />
          <MetricPill label="Patients" value={totalPatients ?? 0} />
        </div>
      </div>
    </section>
  );
}

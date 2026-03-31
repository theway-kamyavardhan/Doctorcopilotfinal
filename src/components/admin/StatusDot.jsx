import React from "react";
import { motion } from "framer-motion";

function getDotStyles(status = "unknown") {
  const normalized = String(status || "").toLowerCase();
  if (
    normalized.includes("online") ||
    normalized.includes("healthy") ||
    normalized.includes("connected") ||
    normalized.includes("ready") ||
    normalized.includes("success")
  ) {
    return "bg-emerald-400 shadow-[0_0_16px_rgba(74,222,128,0.65)]";
  }
  if (
    normalized.includes("processing") ||
    normalized.includes("pending") ||
    normalized.includes("busy") ||
    normalized.includes("degraded") ||
    normalized.includes("warning")
  ) {
    return "bg-amber-400 shadow-[0_0_16px_rgba(251,191,36,0.65)]";
  }
  return "bg-rose-400 shadow-[0_0_16px_rgba(251,113,133,0.65)]";
}

export default function StatusDot({ status, className = "" }) {
  return (
    <motion.span
      aria-hidden="true"
      animate={{ opacity: [0.65, 1, 0.65], scale: [1, 1.12, 1] }}
      transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
      className={`inline-flex h-2.5 w-2.5 rounded-full ${getDotStyles(status)} ${className}`}
    />
  );
}

import React from "react";
import { getAdminStatTone } from "./adminTheme";
import { useTheme } from "../../context/ThemeContext";

export default function AdminStatTile({ label, value, tone = "default", helper = null, icon: Icon }) {
  const { isDark } = useTheme();

  return (
    <div
      className={`rounded-2xl border p-5 transition-all duration-300 hover:scale-[1.015] ${getAdminStatTone(tone, isDark)}`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className={`text-[11px] font-black uppercase tracking-[0.24em] ${isDark ? "text-gray-300" : "text-blue-900/60"}`}>{label}</div>
        {Icon ? (
          <div className={`rounded-xl border p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] ${isDark ? "border-white/10 bg-[#0D1424]/80 text-white" : "border-white/40 bg-white/60 text-blue-700"}`}>
            <Icon size={16} />
          </div>
        ) : null}
      </div>
      <div className={`mt-4 text-3xl font-black tracking-tight ${isDark ? "text-white" : "text-slate-900"}`}>{value}</div>
      {helper ? <div className={`mt-2 text-sm leading-6 ${isDark ? "text-gray-400" : "text-slate-700/80"}`}>{helper}</div> : null}
    </div>
  );
}

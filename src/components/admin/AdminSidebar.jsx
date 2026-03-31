import React from "react";
import { getAdminTheme } from "./adminTheme";
import { useTheme } from "../../context/ThemeContext";

export default function AdminSidebar({ items, activeKey, onChange }) {
  const { isDark } = useTheme();
  const theme = getAdminTheme(isDark);

  return (
    <div className="flex h-full flex-col gap-5">
      <div className={`${theme.insetSurface} px-4 py-5`}>
        <div className={`text-[11px] font-black uppercase tracking-[0.32em] ${isDark ? "text-cyan-300/90" : "text-blue-600/90"}`}>
          DoctorCopilot
        </div>
        <h1 className={`mt-3 text-2xl font-black tracking-tight ${isDark ? "text-white" : "text-slate-900"}`}>
          Admin Control
        </h1>
        <p className={`mt-2 text-sm leading-6 ${isDark ? "text-gray-400" : "text-slate-500"}`}>
          Manage clinicians, patients, reports, and the AI processing backbone from one secure workspace.
        </p>
      </div>

      <nav className="space-y-2">
        {items.map((item) => {
          const Icon = item.icon;
          const active = activeKey === item.key;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => onChange(item.key)}
              className={`flex w-full items-start gap-3 rounded-[1.4rem] px-4 py-3 text-left transition-all ${
                active
                  ? isDark
                    ? "border border-cyan-400/30 bg-cyan-500/12 text-white shadow-[0_0_0_1px_rgba(34,211,238,0.12),0_18px_50px_rgba(34,211,238,0.15)]"
                    : "border border-blue-400/40 bg-blue-500/10 text-blue-900 shadow-[0_0_0_1px_rgba(59,130,246,0.12),0_12px_40px_rgba(59,130,246,0.12)]"
                  : isDark
                    ? "border border-transparent bg-transparent text-gray-400 hover:bg-white/6 hover:text-white"
                    : "border border-transparent bg-transparent text-slate-500 hover:bg-slate-200/60 hover:text-slate-900"
              }`}
            >
              <div
                className={`mt-0.5 rounded-xl border p-2 transition-all duration-300 ${
                  active
                    ? isDark
                      ? "border-cyan-400/20 bg-cyan-400/14 text-cyan-100 shadow-[0_0_24px_rgba(34,211,238,0.14)]"
                      : "border-blue-400/30 bg-blue-500/15 text-blue-600 shadow-[0_0_18px_rgba(59,130,246,0.14)]"
                    : isDark
                      ? "border-white/10 bg-white/5 text-gray-500"
                      : "border-slate-200 bg-white text-slate-400 shadow-sm"
                }`}
              >
                <Icon size={16} />
              </div>
              <div className="min-w-0">
                <div className="font-bold">{item.label}</div>
                <div className={`mt-1 text-xs leading-5 ${active ? (isDark ? "text-cyan-100/70" : "text-blue-800/70") : isDark ? "text-gray-500" : "text-slate-500"}`}>
                  {item.description}
                </div>
              </div>
            </button>
          );
        })}
      </nav>
    </div>
  );
}

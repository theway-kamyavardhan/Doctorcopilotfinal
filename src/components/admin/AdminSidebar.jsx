import React from "react";
import { adminTheme } from "./adminTheme";

export default function AdminSidebar({ items, activeKey, onChange }) {
  return (
    <div className="flex h-full flex-col gap-5">
      <div className={`${adminTheme.insetSurface} px-4 py-5`}>
        <div className="text-[11px] font-black uppercase tracking-[0.32em] text-cyan-300/90">
          DoctorCopilot
        </div>
        <h1 className="mt-3 text-2xl font-black tracking-tight text-white">Admin Control</h1>
        <p className="mt-2 text-sm leading-6 text-gray-400">
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
                  ? "border border-cyan-400/30 bg-cyan-500/12 text-white shadow-[0_0_0_1px_rgba(34,211,238,0.12),0_18px_50px_rgba(34,211,238,0.15)]"
                  : "border border-transparent bg-transparent text-gray-300 hover:bg-white/6 hover:text-white"
              }`}
            >
              <div
                className={`mt-0.5 rounded-xl border p-2 transition-all duration-300 ${
                  active
                    ? "border-cyan-400/20 bg-cyan-400/14 text-cyan-100 shadow-[0_0_24px_rgba(34,211,238,0.14)]"
                    : "border-white/10 bg-white/5 text-gray-400"
                }`}
              >
                <Icon size={16} />
              </div>
              <div className="min-w-0">
                <div className="font-bold">{item.label}</div>
                <div className="mt-1 text-xs leading-5 text-gray-400">{item.description}</div>
              </div>
            </button>
          );
        })}
      </nav>
    </div>
  );
}

import React from "react";
import { getAdminStatTone } from "./adminTheme";

export default function AdminStatTile({ label, value, tone = "default", helper = null, icon: Icon }) {
  return (
    <div
      className={`rounded-2xl border p-5 transition-all duration-300 hover:scale-[1.015] ${getAdminStatTone(tone)}`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="text-[11px] font-black uppercase tracking-[0.24em] text-gray-300">{label}</div>
        {Icon ? (
          <div className="rounded-xl border border-white/10 bg-[#0D1424]/80 p-2 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
            <Icon size={16} />
          </div>
        ) : null}
      </div>
      <div className="mt-4 text-3xl font-black tracking-tight text-white">{value}</div>
      {helper ? <div className="mt-2 text-sm leading-6 text-gray-400">{helper}</div> : null}
    </div>
  );
}

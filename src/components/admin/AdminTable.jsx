import React from "react";
import { getAdminTheme } from "./adminTheme";
import { useTheme } from "../../context/ThemeContext";

export default function AdminTable({ columns, rows, emptyMessage = "No records available." }) {
  const { isDark } = useTheme();
  const theme = getAdminTheme(isDark);
  const templateColumns = `repeat(${columns.length}, minmax(0, 1fr))`;

  return (
    <div className={`overflow-hidden ${theme.insetSurface}`}>
      <div
        className={`hidden gap-4 border-b px-4 py-3 text-[11px] font-black uppercase tracking-[0.24em] md:grid ${
          isDark ? "border-white/10 bg-[#0A1020]/90 text-gray-400" : "border-slate-200 bg-slate-100 text-slate-500"
        }`}
        style={{ gridTemplateColumns: templateColumns }}
      >
        {columns.map((column) => (
          <div key={column}>{column}</div>
        ))}
      </div>

      {rows.length ? (
        <div className={`divide-y ${isDark ? "divide-white/8" : "divide-slate-200"}`}>
          {rows.map((row, index) => (
            <div
              key={row.key || index}
              className={`px-4 py-4 transition-colors duration-300 ${
                isDark ? "hover:bg-white/5" : "hover:bg-white/40"
              }`}
            >
              <div className="grid gap-3 md:grid" style={{ gridTemplateColumns: templateColumns }}>
                {row.cells.map((cell, cellIndex) => (
                  <div key={`${row.key || index}-${cellIndex}`} className="min-w-0">
                    <div className={`mb-1 text-[11px] font-black uppercase tracking-[0.22em] md:hidden ${isDark ? "text-gray-400" : "text-slate-500"}`}>
                      {columns[cellIndex]}
                    </div>
                    <div className={`text-sm leading-6 ${isDark ? "text-gray-100" : "text-slate-700"}`}>{cell}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className={`px-4 py-10 text-center text-sm ${isDark ? "text-gray-400" : "text-slate-500"}`}>{emptyMessage}</div>
      )}
    </div>
  );
}

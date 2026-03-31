import React from "react";
import { adminTheme } from "./adminTheme";

export default function AdminTable({ columns, rows, emptyMessage = "No records available." }) {
  const templateColumns = `repeat(${columns.length}, minmax(0, 1fr))`;

  return (
    <div className={`overflow-hidden ${adminTheme.insetSurface}`}>
      <div
        className="hidden gap-4 border-b border-white/10 bg-[#0A1020]/90 px-4 py-3 text-[11px] font-black uppercase tracking-[0.24em] text-gray-400 md:grid"
        style={{ gridTemplateColumns: templateColumns }}
      >
        {columns.map((column) => (
          <div key={column}>{column}</div>
        ))}
      </div>

      {rows.length ? (
        <div className="divide-y divide-white/8">
          {rows.map((row, index) => (
            <div key={row.key || index} className="px-4 py-4 transition-colors duration-300 hover:bg-white/5">
              <div className="grid gap-3 md:grid" style={{ gridTemplateColumns: templateColumns }}>
                {row.cells.map((cell, cellIndex) => (
                  <div key={`${row.key || index}-${cellIndex}`} className="min-w-0">
                    <div className="mb-1 text-[11px] font-black uppercase tracking-[0.22em] text-gray-400 md:hidden">
                      {columns[cellIndex]}
                    </div>
                    <div className="text-sm leading-6 text-gray-100">{cell}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="px-4 py-10 text-center text-sm text-gray-400">{emptyMessage}</div>
      )}
    </div>
  );
}

import React from "react";
import { getAdminStatusTone } from "./adminTheme";
import { useTheme } from "../../context/ThemeContext";

export default function AdminStatusBadge({ value }) {
  const { isDark } = useTheme();

  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold capitalize ${
        isDark ? "shadow-[0_10px_24px_rgba(0,0,0,0.22)]" : "shadow-sm"
      } ${getAdminStatusTone(value, isDark)}`}
    >
      {String(value || "unknown").replaceAll("_", " ")}
    </span>
  );
}

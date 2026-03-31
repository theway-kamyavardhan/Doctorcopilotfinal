import React from "react";
import { getAdminStatusTone } from "./adminTheme";

export default function AdminStatusBadge({ value }) {
  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold capitalize shadow-[0_10px_24px_rgba(0,0,0,0.22)] ${getAdminStatusTone(value)}`}
    >
      {String(value || "unknown").replaceAll("_", " ")}
    </span>
  );
}

import React from "react";
import { getAdminTheme } from "./adminTheme";
import { useTheme } from "../../context/ThemeContext";

export default function AdminConfirmModal({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  busy = false,
  onConfirm,
  onCancel,
}) {
  const { isDark } = useTheme();
  const theme = getAdminTheme(isDark);

  if (!open) return null;

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center px-4 backdrop-blur-md ${isDark ? "bg-[#040712]/80" : "bg-slate-900/40"}`}>
      <div className={`w-full max-w-md p-6 ${theme.surfaceMuted}`}>
        <h3 className={`text-2xl font-black ${isDark ? "text-white" : "text-slate-900"}`}>{title}</h3>
        <p className={`mt-3 text-sm leading-7 ${isDark ? "text-gray-400" : "text-slate-500"}`}>{description}</p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className={`${theme.ghostButton} disabled:opacity-50`}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className={`${theme.dangerButton} disabled:opacity-50`}
          >
            {busy ? "Working..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

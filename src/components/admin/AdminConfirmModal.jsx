import React from "react";
import { adminTheme } from "./adminTheme";

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
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#040712]/80 px-4 backdrop-blur-md">
      <div className={`w-full max-w-md p-6 ${adminTheme.surfaceMuted}`}>
        <h3 className="text-2xl font-black text-white">{title}</h3>
        <p className="mt-3 text-sm leading-7 text-gray-400">{description}</p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className={`${adminTheme.ghostButton} disabled:opacity-50`}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className={`${adminTheme.dangerButton} disabled:opacity-50`}
          >
            {busy ? "Working..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

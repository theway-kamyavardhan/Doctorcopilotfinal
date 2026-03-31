import React from "react";
import { getAdminTheme } from "./adminTheme";
import { useTheme } from "../../context/ThemeContext";

export default function AdminSectionCard({ title, subtitle, actions = null, children }) {
  const { isDark } = useTheme();
  const theme = getAdminTheme(isDark);

  return (
    <section className={`${theme.surface} p-6 transition-colors`}>
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className={theme.eyebrow}>{title}</div>
          {subtitle ? <p className={`mt-2 max-w-3xl text-sm leading-7 ${theme.body}`}>{subtitle}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-3">{actions}</div> : null}
      </div>
      {children}
    </section>
  );
}

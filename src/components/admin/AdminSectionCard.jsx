import React from "react";
import { adminTheme } from "./adminTheme";

export default function AdminSectionCard({ title, subtitle, actions = null, children }) {
  return (
    <section className={`${adminTheme.surface} p-6`}>
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className={adminTheme.eyebrow}>{title}</div>
          {subtitle ? <p className={`mt-2 max-w-3xl text-sm leading-7 ${adminTheme.body}`}>{subtitle}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-3">{actions}</div> : null}
      </div>
      {children}
    </section>
  );
}

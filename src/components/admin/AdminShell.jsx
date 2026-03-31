import React from "react";
import { adminTheme } from "./adminTheme";

export default function AdminShell({ sidebar, children }) {
  return (
    <div className={adminTheme.shell}>
      <div className="mx-auto grid max-w-[1600px] gap-6 xl:grid-cols-[280px_1fr]">
        <aside className={`${adminTheme.surface} p-4`}>
          {sidebar}
        </aside>
        <main className="space-y-6">{children}</main>
      </div>
    </div>
  );
}

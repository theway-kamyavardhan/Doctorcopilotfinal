import React from "react";
import { getAdminTheme } from "./adminTheme";
import { useTheme } from "../../context/ThemeContext";

export default function AdminShell({ sidebar, children }) {
  const { isDark } = useTheme();
  const theme = getAdminTheme(isDark);

  return (
    <div className={theme.shell}>
      <div className="mx-auto grid max-w-[1600px] gap-6 xl:grid-cols-[280px_1fr]">
        <aside className={`${theme.surface} p-4`}>
          {sidebar}
        </aside>
        <main className="space-y-6">{children}</main>
      </div>
    </div>
  );
}

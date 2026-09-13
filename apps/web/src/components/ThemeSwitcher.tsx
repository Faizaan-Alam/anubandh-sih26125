"use client";

import { useEffect, useState } from "react";
import { DEFAULT_THEME, THEMES, applyTheme, readStoredTheme } from "@/lib/themes";

export function ThemeSwitcher({ compact = false }: { compact?: boolean }) {
  const [theme, setTheme] = useState(DEFAULT_THEME);

  useEffect(() => {
    setTheme(readStoredTheme());
  }, []);

  return (
    <label className="flex items-center gap-2">
      {!compact && <span className="text-xs font-semibold opacity-70">Theme</span>}
      <select
        aria-label="Color theme"
        className="select select-bordered select-sm min-w-[8.5rem]"
        value={theme}
        onChange={(e) => {
          setTheme(e.target.value);
          applyTheme(e.target.value);
        }}
      >
        {THEMES.map((t) => (
          <option key={t.id} value={t.id}>
            {t.label}
          </option>
        ))}
      </select>
    </label>
  );
}

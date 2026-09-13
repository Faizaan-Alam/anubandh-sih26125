"use client";

import { useEffect, useState } from "react";
import { DEFAULT_THEME, THEMES, applyTheme, readStoredTheme } from "@/lib/themes";

export function ThemeSwitcher() {
  const [theme, setTheme] = useState(DEFAULT_THEME);
  useEffect(() => {
    setTheme(readStoredTheme());
  }, []);
  return (
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
  );
}

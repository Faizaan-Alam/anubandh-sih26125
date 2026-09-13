"use client";

import { useEffect, type ReactNode } from "react";
import { applyTheme, readStoredTheme } from "@/lib/themes";

export function ThemeProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    applyTheme(readStoredTheme());
  }, []);
  return <>{children}</>;
}

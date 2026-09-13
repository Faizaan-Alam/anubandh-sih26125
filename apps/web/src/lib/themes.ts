export const THEMES = [
  { id: "corporate", label: "Corporate" },
  { id: "business", label: "Business" },
  { id: "nord", label: "Nord" },
  { id: "winter", label: "Winter" },
  { id: "emerald", label: "Emerald" },
  { id: "forest", label: "Forest" },
  { id: "aqua", label: "Aqua" },
  { id: "pastel", label: "Pastel" },
  { id: "dim", label: "Dim" },
  { id: "night", label: "Night" },
  { id: "luxury", label: "Luxury" },
  { id: "synthwave", label: "Synthwave" }
] as const;

export const DEFAULT_THEME = "corporate";
export const THEME_STORAGE_KEY = "anubandh.theme";

export function applyTheme(theme: string): void {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem(THEME_STORAGE_KEY, theme);
}

export function readStoredTheme(): string {
  if (typeof window === "undefined") return DEFAULT_THEME;
  return localStorage.getItem(THEME_STORAGE_KEY) || DEFAULT_THEME;
}

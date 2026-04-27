export type ThemePreference = "system" | "light" | "dark";
export type ResolvedTheme = "light" | "dark";
export type StylePreference =
  | "cold-white"
  | "moonlight"
  | "glass"
  | "dark-first";

const THEME_STORAGE_KEY = "quantumx-theme-preference";
const STYLE_STORAGE_KEY = "quantumx-style-preference";

export function readThemePreference(): ThemePreference {
  if (typeof window === "undefined") return "system";
  const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
  return stored === "light" || stored === "dark" || stored === "system"
    ? stored
    : "system";
}

export function writeThemePreference(preference: ThemePreference) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(THEME_STORAGE_KEY, preference);
}

export function readStylePreference(): StylePreference {
  if (typeof window === "undefined") return "moonlight";
  const stored = window.localStorage.getItem(STYLE_STORAGE_KEY);
  return stored === "cold-white" ||
    stored === "moonlight" ||
    stored === "glass" ||
    stored === "dark-first"
    ? stored
    : "moonlight";
}

export function writeStylePreference(preference: StylePreference) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STYLE_STORAGE_KEY, preference);
}

export function resolveTheme(preference: ThemePreference): ResolvedTheme {
  if (preference === "light" || preference === "dark") return preference;
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

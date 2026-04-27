export type ThemePreference = "system" | "light" | "dark";
export type ResolvedTheme = "light" | "dark";
export type VisualStylePreference = "cold-white" | "moonlight" | "glass" | "dark-first";

const THEME_STORAGE_KEY = "quantumx-theme-preference";
const STYLE_STORAGE_KEY = "quantumx-style-preference";

export const DEFAULT_STYLE_PREFERENCE: VisualStylePreference = "moonlight";

export const visualStyleOptions: Array<{
  value: VisualStylePreference;
  label: string;
  description: string;
  swatches: [string, string, string];
}> = [
  {
    value: "cold-white",
    label: "冷白极简",
    description: "干净、现代、工具感",
    swatches: ["#f6f8fa", "#ffffff", "#3e5976"],
  },
  {
    value: "moonlight",
    label: "月光蓝灰",
    description: "安静、理性、AI Native",
    swatches: ["#ecf1f6", "#fbfdff", "#436584"],
  },
  {
    value: "glass",
    label: "黑白玻璃",
    description: "克制、高级、展示感",
    swatches: ["#f7f7f6", "#ffffff", "#0c0c0b"],
  },
  {
    value: "dark-first",
    label: "深色优先",
    description: "沉浸、夜间、写作友好",
    swatches: ["#10141a", "#1f2631", "#69b7ac"],
  },
];

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

export function readVisualStylePreference(): VisualStylePreference {
  if (typeof window === "undefined") return DEFAULT_STYLE_PREFERENCE;
  const stored = window.localStorage.getItem(STYLE_STORAGE_KEY);
  return stored === "cold-white" ||
    stored === "moonlight" ||
    stored === "glass" ||
    stored === "dark-first"
    ? stored
    : DEFAULT_STYLE_PREFERENCE;
}

export function writeVisualStylePreference(preference: VisualStylePreference) {
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

import { LaptopMinimal, MoonStar, Sparkles, SunMedium } from "lucide-react";
import type {
  ResolvedTheme,
  StylePreference,
  ThemePreference,
} from "../lib/theme";

interface ThemeToggleProps {
  preference: ThemePreference;
  resolvedTheme: ResolvedTheme;
  stylePreference: StylePreference;
  onAppearanceChange: (preference: ThemePreference) => void;
  onStyleChange: (preference: StylePreference) => void;
  compact?: boolean;
}

const appearanceOptions: Array<{
  value: ThemePreference;
  label: string;
  icon: typeof SunMedium;
}> = [
  { value: "light", label: "浅色", icon: SunMedium },
  { value: "dark", label: "深色", icon: MoonStar },
  { value: "system", label: "跟随系统", icon: LaptopMinimal },
];

const styleOptions: Array<{
  value: StylePreference;
  label: string;
  subtitle: string;
  swatches: string[];
}> = [
  {
    value: "cold-white",
    label: "冷白极简",
    subtitle: "更清爽、更工具感",
    swatches: ["#FFFFFF", "#F2F6FA", "#D5DCE6", "#2A303A"],
  },
  {
    value: "moonlight",
    label: "月光蓝灰",
    subtitle: "安静、理性、适合作为默认",
    swatches: ["#EBF1F8", "#D8E5F2", "#4E707A", "#1A2F4A"],
  },
  {
    value: "glass",
    label: "黑白玻璃",
    subtitle: "更克制，也更适合展示",
    swatches: ["#FAFAFB", "#E2E3E8", "#656970", "#0C0D0F"],
  },
  {
    value: "dark-first",
    label: "深色优先",
    subtitle: "更沉浸，适合夜间写作",
    swatches: ["#1B212B", "#343E4C", "#87ABAE", "#EFF5FB"],
  },
];

export function ThemeToggle({
  preference,
  resolvedTheme,
  stylePreference,
  onAppearanceChange,
  onStyleChange,
  compact = false,
}: ThemeToggleProps) {
  return (
    <div className="space-y-5">
      <div>
        <div className="text-sm font-medium text-ink">外观模式</div>
        <div className="mt-1 text-xs leading-6 text-muted">
          当前
          {preference === "system"
            ? `跟随系统（${resolvedTheme === "dark" ? "深色" : "浅色"}）`
            : `使用${preference === "dark" ? "深色" : "浅色"}`}
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        {appearanceOptions.map((option) => {
          const Icon = option.icon;
          const active = preference === option.value;

          return (
            <button
              key={option.value}
              className={`rounded-[22px] border px-3 py-3 text-left transition ${
                active
                  ? "theme-surface-ghost-strong border-line/80 text-ink shadow-[0_16px_34px_rgba(24,28,36,0.08)]"
                  : "theme-surface-soft border-transparent text-muted hover:border-line/70 hover:text-ink"
              }`}
              type="button"
              onClick={() => onAppearanceChange(option.value)}
            >
              <div className="mb-2 inline-flex h-9 w-9 items-center justify-center rounded-2xl theme-surface-ghost text-ink">
                <Icon size={16} strokeWidth={1.8} />
              </div>
              <div className="text-sm font-medium">{option.label}</div>
            </button>
          );
        })}
      </div>

      <div className="pt-1">
        <div className="mb-1 flex items-center gap-2 text-sm font-medium text-ink">
          <Sparkles size={15} strokeWidth={1.8} />
          视觉风格
        </div>
        <div className="text-xs leading-6 text-muted">
          同一套功能，不同的视觉氛围。切换后会立即生效，并保留到下次打开。
        </div>
      </div>

      <div className={`grid gap-2 ${compact ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2"}`}>
        {styleOptions.map((option) => {
          const active = stylePreference === option.value;

          return (
            <button
              key={option.value}
              className={`rounded-[22px] border px-3.5 py-3.5 text-left transition ${
                active
                  ? "theme-surface-ghost-strong border-line/80 text-ink shadow-[0_18px_36px_rgba(24,28,36,0.08)]"
                  : "theme-surface-soft border-transparent text-muted hover:border-line/70 hover:text-ink"
              }`}
              type="button"
              onClick={() => onStyleChange(option.value)}
            >
              <div className="mb-3 flex gap-1.5">
                {option.swatches.map((swatch) => (
                  <span
                    key={swatch}
                    className="h-7 flex-1 rounded-full border border-line/50 shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]"
                    style={{ backgroundColor: swatch }}
                  />
                ))}
              </div>
              <div className="text-sm font-medium text-ink">{option.label}</div>
              <div className="mt-1 text-xs leading-5 text-muted">{option.subtitle}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

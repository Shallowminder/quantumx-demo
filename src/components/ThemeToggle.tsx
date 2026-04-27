import { LaptopMinimal, MoonStar, SunMedium } from "lucide-react";
import type { ResolvedTheme, ThemePreference } from "../lib/theme";

interface ThemeToggleProps {
  preference: ThemePreference;
  resolvedTheme: ResolvedTheme;
  onChange: (preference: ThemePreference) => void;
  compact?: boolean;
}

const options: Array<{
  value: ThemePreference;
  label: string;
  icon: typeof SunMedium;
}> = [
  { value: "light", label: "浅色", icon: SunMedium },
  { value: "dark", label: "深色", icon: MoonStar },
  { value: "system", label: "系统", icon: LaptopMinimal },
];

export function ThemeToggle({
  preference,
  resolvedTheme,
  onChange,
  compact = false,
}: ThemeToggleProps) {
  return (
    <div className="space-y-3">
      <div>
        <div className="text-sm font-medium text-ink">外观</div>
        <div className="mt-1 text-xs text-muted">
          当前{preference === "system" ? `跟随系统（${resolvedTheme === "dark" ? "深色" : "浅色"}）` : `使用${preference === "dark" ? "深色" : "浅色"}`}
        </div>
      </div>

      <div className={`grid gap-2 ${compact ? "grid-cols-3" : "grid-cols-3"}`}>
        {options.map((option) => {
          const Icon = option.icon;
          const active = preference === option.value;

          return (
            <button
              key={option.value}
              className={`flex items-center justify-center gap-2 rounded-2xl px-3 py-2.5 text-sm transition ${
                active
                  ? resolvedTheme === "dark"
                    ? "theme-surface-ghost-strong text-ink shadow-[0_12px_28px_rgba(0,0,0,0.2)] ring-1 ring-line/70"
                    : "bg-ink text-white shadow-[0_12px_28px_rgba(37,37,33,0.12)]"
                  : "theme-surface-soft text-muted hover:text-ink"
              }`}
              type="button"
              onClick={() => onChange(option.value)}
            >
              <Icon size={15} strokeWidth={1.9} />
              <span>{option.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

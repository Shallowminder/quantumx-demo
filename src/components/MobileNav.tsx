import { useEffect, useMemo, useRef, useState } from "react";
import {
  BookOpenText,
  ChartNoAxesCombined,
  Database,
  Ellipsis,
  Home,
  Layers3,
  NotebookPen,
  Search,
  X,
} from "lucide-react";
import type {
  ResolvedTheme,
  StylePreference,
  ThemePreference,
} from "../lib/theme";
import type { ViewKey } from "../types";
import { ThemeToggle } from "./ThemeToggle";

const primaryNavItems = [
  { key: "today" as const, label: "今日", icon: NotebookPen },
  { key: "home" as const, label: "我的", icon: Home },
  { key: "search" as const, label: "找回", icon: Search },
  { key: "topics" as const, label: "主题", icon: Layers3 },
];

const overflowNavItems = [
  { key: "distill" as const, label: "蒸馏输出", note: "把历史记录整理成草稿", icon: BookOpenText },
  { key: "insights" as const, label: "个人洞察", note: "回看最近的长期关注", icon: ChartNoAxesCombined },
  { key: "data" as const, label: "数据与隐私", note: "登录、同步和备份", icon: Database },
];

function resolveActiveKey(activeView: ViewKey) {
  if (activeView === "detail") return "today";
  return activeView;
}

export function MobileNav({
  activeView,
  onNavigate,
  preference,
  resolvedTheme,
  stylePreference,
  onThemePreferenceChange,
  onStylePreferenceChange,
}: {
  activeView: ViewKey;
  onNavigate: (view: ViewKey) => void;
  preference: ThemePreference;
  resolvedTheme: ResolvedTheme;
  stylePreference: StylePreference;
  onThemePreferenceChange: (preference: ThemePreference) => void;
  onStylePreferenceChange: (preference: StylePreference) => void;
}) {
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const navRef = useRef<HTMLElement | null>(null);
  const resolvedActiveKey = resolveActiveKey(activeView);
  const isOverflowActive = useMemo(
    () => overflowNavItems.some((item) => item.key === resolvedActiveKey),
    [resolvedActiveKey],
  );

  useEffect(() => {
    setIsMoreOpen(false);
  }, [activeView]);

  useEffect(() => {
    if (!isMoreOpen) return undefined;

    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (
        !menuRef.current?.contains(target) &&
        !navRef.current?.contains(target)
      ) {
        setIsMoreOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsMoreOpen(false);
      }
    }

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isMoreOpen]);

  return (
    <>
      {isMoreOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            aria-label="关闭更多菜单"
            className="theme-overlay-dim absolute inset-0 h-full w-full"
            type="button"
            onClick={() => setIsMoreOpen(false)}
          />
          <div
            ref={menuRef}
            className="frost-panel-strong absolute inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+6.2rem)] max-h-[min(72vh,620px)] overflow-y-auto overscroll-contain rounded-[30px] p-3 pb-5 subtle-scrollbar"
          >
            <div className="sticky top-0 z-10 -mx-1 mb-2 flex items-center justify-between rounded-[22px] bg-[rgb(var(--panel-strong-rgb))] px-3 py-2 shadow-[0_10px_28px_rgb(var(--shadow-rgb)_/_0.08)]">
              <div>
                <div className="text-sm font-semibold text-ink">更多</div>
                <div className="text-xs text-muted">导航、外观和显示设置</div>
              </div>
              <button
                aria-label="关闭更多菜单"
                className="theme-button-muted flex h-9 w-9 items-center justify-center rounded-2xl"
                type="button"
                onClick={() => setIsMoreOpen(false)}
              >
                <X size={16} strokeWidth={1.8} />
              </button>
            </div>
            <div className="space-y-1">
              {overflowNavItems.map((item) => {
                const Icon = item.icon;
                const active = resolvedActiveKey === item.key;

                return (
                  <button
                    key={item.key}
                    className={`flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition ${
                      active
                        ? "theme-surface-ghost-strong text-ink shadow-[0_12px_28px_rgb(var(--shadow-rgb)_/_0.08)]"
                        : "text-muted hover:bg-[rgb(var(--surface-overlay-rgb)/0.72)] hover:text-ink"
                    }`}
                    type="button"
                    onClick={() => {
                      setIsMoreOpen(false);
                      onNavigate(item.key);
                    }}
                  >
                    <div className="theme-surface-ghost flex h-9 w-9 items-center justify-center rounded-2xl text-ink">
                      <Icon size={18} strokeWidth={1.8} />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-ink">{item.label}</div>
                      <div className="text-xs text-muted">{item.note}</div>
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="soft-divider mt-3 border-t px-3 pb-3 pt-4">
              <ThemeToggle
                compact
                stylePreference={stylePreference}
                preference={preference}
                resolvedTheme={resolvedTheme}
                onAppearanceChange={onThemePreferenceChange}
                onStyleChange={onStylePreferenceChange}
              />
            </div>
          </div>
        </div>
      )}

      <nav
        ref={navRef}
        className="frost-panel fixed inset-x-4 bottom-[calc(env(safe-area-inset-bottom)+0.75rem)] z-50 rounded-[28px] p-1.5 lg:hidden"
      >
        <div className="grid grid-cols-5 gap-1">
          {primaryNavItems.map((item) => {
            const Icon = item.icon;
            const active = resolvedActiveKey === item.key;

            return (
              <button
                key={item.key}
                className={`flex min-h-[62px] flex-col items-center justify-center gap-1 rounded-[22px] px-2 py-2 text-[11px] transition ${
                  active
                    ? "theme-surface-ghost-strong text-ink shadow-[0_10px_28px_rgb(var(--shadow-rgb)_/_0.08)]"
                    : "text-muted"
                }`}
                type="button"
                onClick={() => onNavigate(item.key)}
              >
                <Icon size={18} strokeWidth={1.9} />
                <span>{item.label}</span>
              </button>
            );
          })}

          <button
            className={`flex min-h-[62px] flex-col items-center justify-center gap-1 rounded-[22px] px-2 py-2 text-[11px] transition ${
              isMoreOpen || isOverflowActive
                ? "theme-surface-ghost-strong text-ink shadow-[0_10px_28px_rgb(var(--shadow-rgb)_/_0.08)]"
                : "text-muted"
            }`}
            type="button"
            onClick={() => setIsMoreOpen((current) => !current)}
          >
            <Ellipsis size={18} strokeWidth={1.9} />
            <span>更多</span>
          </button>
        </div>
      </nav>
    </>
  );
}

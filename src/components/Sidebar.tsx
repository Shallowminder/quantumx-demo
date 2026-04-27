import {
  BookOpenText,
  ChartNoAxesCombined,
  Database,
  Home,
  Layers3,
  NotebookPen,
  Search,
} from "lucide-react";
import type { ResolvedTheme, StylePreference, ThemePreference } from "../lib/theme";
import type { ViewKey } from "../types";
import { AccountMenu } from "./AccountMenu";
import { ThemeToggle } from "./ThemeToggle";

interface SidebarProps {
  activeView: ViewKey;
  onNavigate: (view: ViewKey) => void;
  onOpenData: () => void;
  preference: ThemePreference;
  resolvedTheme: ResolvedTheme;
  stylePreference: StylePreference;
  onThemePreferenceChange: (preference: ThemePreference) => void;
  onStylePreferenceChange: (preference: StylePreference) => void;
}

const navItems: Array<{
  key: ViewKey;
  label: string;
  icon: typeof NotebookPen;
}> = [
  { key: "today", label: "今日思考", icon: NotebookPen },
  { key: "home", label: "我的思考", icon: Home },
  { key: "search", label: "找回想法", icon: Search },
  { key: "topics", label: "主题沉淀", icon: Layers3 },
  { key: "distill", label: "蒸馏输出", icon: BookOpenText },
  { key: "insights", label: "个人洞察", icon: ChartNoAxesCombined },
  { key: "data", label: "数据与隐私", icon: Database },
];

export function Sidebar({
  activeView,
  onNavigate,
  onOpenData,
  preference,
  resolvedTheme,
  stylePreference,
  onThemePreferenceChange,
  onStylePreferenceChange,
}: SidebarProps) {
  return (
    <aside className="theme-sidebar hidden h-screen w-[288px] shrink-0 border-r px-5 py-6 backdrop-blur-2xl lg:sticky lg:top-0 lg:flex lg:flex-col lg:overflow-y-auto subtle-scrollbar">
      <div className="mb-8 flex items-center gap-3 px-2">
        <AccountMenu onOpenData={onOpenData} />
        <div className="min-w-0">
          <div className="text-[16px] font-semibold tracking-normal text-ink">
            QuantumX
          </div>
          <div className="mt-0.5 text-[12px] text-muted">安静的个人思考工作台</div>
        </div>
      </div>

      <nav className="space-y-1.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = activeView === item.key || (activeView === "detail" && item.key === "today");

          return (
            <button
              key={item.key}
              className={`flex w-full items-center gap-3 rounded-2xl px-3.5 py-3 text-left text-sm transition ${
                active
                  ? "frost-panel-strong text-ink"
                  : "text-muted hover:bg-white/55 hover:text-ink"
              }`}
              type="button"
              onClick={() => onNavigate(item.key)}
            >
              <Icon size={18} strokeWidth={1.8} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="mt-auto space-y-4">
        <div className="frost-panel rounded-[24px] p-4 text-sm text-muted">
          <div className="mb-1.5 font-medium text-ink">本周提醒</div>
          <p className="leading-6">
            有 7 条记录已经和旧想法形成关联，适合做一次轻量整理。
          </p>
        </div>

        <div className="frost-panel rounded-[24px] p-4">
          <ThemeToggle
            stylePreference={stylePreference}
            preference={preference}
            resolvedTheme={resolvedTheme}
            onAppearanceChange={onThemePreferenceChange}
            onStyleChange={onStylePreferenceChange}
          />
        </div>
      </div>
    </aside>
  );
}

import {
  BookOpenText,
  ChartNoAxesCombined,
  Database,
  Home,
  Layers3,
  NotebookPen,
} from "lucide-react";
import type { ViewKey } from "../types";

interface SidebarProps {
  activeView: ViewKey;
  onNavigate: (view: ViewKey) => void;
}

const navItems: Array<{
  key: ViewKey;
  label: string;
  icon: typeof NotebookPen;
}> = [
  { key: "today", label: "今日思考", icon: NotebookPen },
  { key: "home", label: "我的思考", icon: Home },
  { key: "topics", label: "主题沉淀", icon: Layers3 },
  { key: "distill", label: "蒸馏输出", icon: BookOpenText },
  { key: "insights", label: "个人洞察", icon: ChartNoAxesCombined },
  { key: "data", label: "数据与隐私", icon: Database },
];

export function Sidebar({ activeView, onNavigate }: SidebarProps) {
  return (
    <aside className="hidden w-64 shrink-0 border-r border-line/80 bg-paper/70 px-4 py-5 lg:flex lg:flex-col">
      <div className="mb-8 flex items-center gap-3 px-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-ink text-white shadow-inset">
          <NotebookPen size={18} strokeWidth={1.8} />
        </div>
        <div>
          <div className="text-[15px] font-semibold tracking-normal text-ink">
            QuantumX
          </div>
          <div className="text-xs text-muted">个人思考沉淀工具</div>
        </div>
      </div>

      <nav className="space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = activeView === item.key || (activeView === "detail" && item.key === "today");

          return (
            <button
              key={item.key}
              className={`flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm transition ${
                active
                  ? "bg-white text-ink shadow-sm"
                  : "text-muted hover:bg-white/70 hover:text-ink"
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

      <div className="mt-auto rounded-lg border border-line bg-white/55 p-3 text-sm text-muted">
        <div className="mb-1 font-medium text-ink">本周提醒</div>
        <p className="leading-6">
          有 7 条记录已经和旧想法形成关联，适合做一次轻量整理。
        </p>
      </div>
    </aside>
  );
}

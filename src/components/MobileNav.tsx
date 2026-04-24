import {
  BookOpenText,
  ChartNoAxesCombined,
  Database,
  Home,
  Layers3,
  NotebookPen,
} from "lucide-react";
import type { ViewKey } from "../types";

const navItems = [
  { key: "today" as const, label: "今日", icon: NotebookPen },
  { key: "home" as const, label: "我的", icon: Home },
  { key: "topics" as const, label: "主题", icon: Layers3 },
  { key: "distill" as const, label: "蒸馏", icon: BookOpenText },
  { key: "insights" as const, label: "洞察", icon: ChartNoAxesCombined },
  { key: "data" as const, label: "数据", icon: Database },
];

export function MobileNav({
  activeView,
  onNavigate,
}: {
  activeView: ViewKey;
  onNavigate: (view: ViewKey) => void;
}) {
  return (
    <nav className="fixed inset-x-3 bottom-3 z-20 grid grid-cols-6 rounded-xl border border-line bg-white/95 p-1 shadow-soft backdrop-blur lg:hidden">
      {navItems.map((item) => {
        const Icon = item.icon;
        const active = activeView === item.key || (activeView === "detail" && item.key === "today");
        return (
          <button
            key={item.key}
            className={`flex flex-col items-center gap-1 rounded-lg px-2 py-2 text-[11px] transition ${
              active ? "bg-paper text-ink" : "text-muted"
            }`}
            type="button"
            onClick={() => onNavigate(item.key)}
          >
            <Icon size={17} strokeWidth={1.8} />
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

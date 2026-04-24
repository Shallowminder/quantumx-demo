import {
  Archive,
  CheckCircle2,
  Circle,
  FileText,
  Link2,
  NotebookPen,
} from "lucide-react";
import { getStatusIndex } from "../lib/visualization";
import type { Thought } from "../types";

const steps = [
  { label: "已记录", icon: NotebookPen },
  { label: "已关联", icon: Link2 },
  { label: "已加入主题", icon: Circle },
  { label: "已用于蒸馏", icon: FileText },
  { label: "已整理", icon: Archive },
];

export function ThoughtStatusTrail({ thought }: { thought: Thought }) {
  const currentIndex = getStatusIndex(thought);

  return (
    <section className="rounded-xl border border-line bg-white p-5 shadow-sm">
      <div className="mb-4 text-sm font-semibold text-ink">这条想法走到哪了</div>
      <div className="grid gap-3 sm:grid-cols-5">
        {steps.map((step, index) => {
          const active = index <= currentIndex;
          const Icon = active ? CheckCircle2 : step.icon;

          return (
            <div key={step.label} className="relative flex items-center gap-2 sm:block">
              {index < steps.length - 1 && (
                <div
                  className={`absolute left-4 top-4 hidden h-px w-[calc(100%+0.75rem)] sm:block ${
                    index < currentIndex ? "bg-sage/50" : "bg-line"
                  }`}
                />
              )}
              <div
                className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full border ${
                  active
                    ? "border-sage/40 bg-sage/10 text-sage"
                    : "border-line bg-canvas text-muted"
                }`}
              >
                <Icon size={15} strokeWidth={1.8} />
              </div>
              <div
                className={`text-sm sm:mt-2 ${
                  active ? "font-medium text-ink" : "text-muted"
                }`}
              >
                {step.label}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

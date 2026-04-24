import type { Topic } from "../types";

const accentClasses: Record<Topic["accent"], string> = {
  sage: "bg-sage/10 text-sage border-sage/20",
  clay: "bg-clay/10 text-clay border-clay/20",
  blue: "bg-slate-100 text-slate-600 border-slate-200",
  amber: "bg-amber/15 text-stone-700 border-amber/30",
  stone: "bg-stone-100 text-stone-600 border-stone-200",
};

export function TopicBadge({ topic }: { topic: Topic }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${accentClasses[topic.accent]}`}
    >
      {topic.name}
    </span>
  );
}

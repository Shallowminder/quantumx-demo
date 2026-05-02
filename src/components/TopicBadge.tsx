import type { Topic } from "../types";

const accentClasses: Record<Topic["accent"], string> = {
  sage: "theme-topic-sage",
  clay: "theme-topic-clay",
  blue: "theme-topic-blue",
  amber: "theme-topic-amber",
  stone: "theme-topic-stone",
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

import type { SavedDistill, Thought, Topic } from "../types";
import { getPersonalHomeSummary } from "../lib/visualization";

export function PersonalStats({
  thoughts,
  topics,
  savedDistills,
}: {
  thoughts: Thought[];
  topics: Topic[];
  savedDistills: SavedDistill[];
}) {
  const summary = getPersonalHomeSummary(thoughts, topics, savedDistills);
  const stats = [
    { label: "记录", value: summary.thoughtCount },
    { label: "主题", value: summary.topicCount },
    { label: "草稿", value: summary.draftCount },
    { label: "活跃日", value: summary.activeDays },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {stats.map((stat) => (
        <div key={stat.label} className="border-t border-line/70 pt-3">
          <div className="text-2xl font-semibold tracking-normal text-ink">
            {stat.value}
          </div>
          <div className="mt-1 text-sm text-muted">{stat.label}</div>
        </div>
      ))}
    </div>
  );
}

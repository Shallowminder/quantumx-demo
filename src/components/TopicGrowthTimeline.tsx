import { Circle } from "lucide-react";
import { formatMonthDay } from "../lib/date";
import { buildTopicTimeline } from "../lib/visualization";
import type { SavedDistill, Thought, Topic } from "../types";

interface TopicGrowthTimelineProps {
  topic: Topic;
  thoughts: Thought[];
  savedDistills?: SavedDistill[];
}

export function TopicGrowthTimeline({
  topic,
  thoughts,
  savedDistills = [],
}: TopicGrowthTimelineProps) {
  const items = buildTopicTimeline(topic, thoughts, savedDistills);

  return (
    <section className="mb-6 rounded-xl border border-line bg-white p-4 shadow-sm">
      <div className="mb-4 text-sm font-semibold text-ink">
        这个主题是怎么长出来的
      </div>
      {items.length === 0 ? (
        <p className="rounded-lg bg-canvas p-3 text-sm leading-6 text-muted">
          这个主题还没有足够记录。多写几条后，这里会显示它如何慢慢形成。
        </p>
      ) : (
        <div className="space-y-4">
          {items.map((item, index) => (
            <div key={item.id} className="grid grid-cols-[24px_minmax(0,1fr)] gap-3">
              <div className="relative flex justify-center">
                {index < items.length - 1 && (
                  <div className="absolute top-5 h-[calc(100%+0.5rem)] w-px bg-line" />
                )}
                <div className="relative z-10 mt-1 flex h-5 w-5 items-center justify-center rounded-full border border-sage/35 bg-sage/10 text-sage">
                  <Circle size={8} fill="currentColor" strokeWidth={0} />
                </div>
              </div>
              <div>
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium text-ink">{item.title}</span>
                  <span className="text-xs text-muted">{formatMonthDay(item.date)}</span>
                </div>
                <p className="text-sm leading-6 text-muted">{item.body}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

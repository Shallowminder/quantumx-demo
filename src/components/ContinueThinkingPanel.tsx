import { ArrowRight } from "lucide-react";
import { getTopTopics } from "../lib/visualization";
import type { Thought, Topic } from "../types";

interface ContinueThinkingPanelProps {
  thoughts: Thought[];
  topics: Topic[];
  onContinueFromThought: (thought: Thought) => void;
  onOpenTopic: (topicId: string) => void;
  onOpenToday: () => void;
}

export function ContinueThinkingPanel({
  thoughts,
  topics,
  onContinueFromThought,
  onOpenTopic,
  onOpenToday,
}: ContinueThinkingPanelProps) {
  const thought = thoughts.find((item) => item.relatedIds.length > 0) ?? thoughts[0];
  const topic = getTopTopics(topics, thoughts, 1)[0]?.topic;

  return (
    <section className="rounded-[18px] bg-white/70 p-5 shadow-[0_12px_34px_rgba(45,43,37,0.045)] ring-1 ring-line/70">
      <h2 className="text-xl font-semibold tracking-normal text-ink">可以从这里继续</h2>
      <div className="mt-4 space-y-3">
        {thought && (
          <button
            className="flex w-full items-center justify-between gap-3 rounded-2xl bg-canvas p-4 text-left transition hover:bg-white"
            type="button"
            onClick={() => onContinueFromThought(thought)}
          >
            <span className="text-sm leading-6 text-ink">
              继续写：“{thought.summary}”
            </span>
            <ArrowRight className="shrink-0 text-muted" size={16} strokeWidth={1.8} />
          </button>
        )}
        {topic && (
          <button
            className="flex w-full items-center justify-between gap-3 rounded-2xl bg-canvas p-4 text-left transition hover:bg-white"
            type="button"
            onClick={() => onOpenTopic(topic.id)}
          >
            <span className="text-sm leading-6 text-ink">
              整理「{topic.name}」里的几条待处理记录
            </span>
            <ArrowRight className="shrink-0 text-muted" size={16} strokeWidth={1.8} />
          </button>
        )}
        <button
          className="flex w-full items-center justify-between gap-3 rounded-2xl bg-canvas p-4 text-left transition hover:bg-white"
          type="button"
          onClick={onOpenToday}
        >
          <span className="text-sm leading-6 text-ink">回到 Today，先记录今天的一句话</span>
          <ArrowRight className="shrink-0 text-muted" size={16} strokeWidth={1.8} />
        </button>
      </div>
    </section>
  );
}

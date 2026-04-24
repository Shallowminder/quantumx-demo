import { MiniSparkline } from "./MiniSparkline";
import { formatMonthDay } from "../lib/date";
import { getTopTopics, getTopicThoughts, safeDate } from "../lib/visualization";
import type { Thought, Topic } from "../types";

interface HomeTopicHighlightsProps {
  thoughts: Thought[];
  topics: Topic[];
  onOpenTopic: (topicId: string) => void;
}

export function HomeTopicHighlights({
  thoughts,
  topics,
  onOpenTopic,
}: HomeTopicHighlightsProps) {
  const highlights = getTopTopics(topics, thoughts, 4);

  return (
    <section>
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold tracking-normal text-ink">长期主题</h2>
          <p className="mt-1 text-sm text-muted">这些问题正在慢慢变成你的长期关注。</p>
        </div>
      </div>
      {highlights.length === 0 ? (
        <p className="rounded-2xl bg-white/70 p-5 text-sm leading-7 text-muted ring-1 ring-line/70">
          再记录几天后，这里会开始出现反复浮现的主题。
        </p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {highlights.map(({ topic, count, questions }) => {
            const topicThoughts = getTopicThoughts(topic, thoughts);
            const latest = topicThoughts
              .map((thought) => safeDate(thought.createdAt))
              .filter((date): date is Date => Boolean(date))
              .sort((a, b) => b.getTime() - a.getTime())[0];
            const values = Array.from({ length: 7 }).map((_, index) => {
              const day = new Date();
              day.setDate(day.getDate() - (6 - index));
              return topicThoughts.filter((thought) => {
                const created = safeDate(thought.createdAt);
                return (
                  created &&
                  created.getFullYear() === day.getFullYear() &&
                  created.getMonth() === day.getMonth() &&
                  created.getDate() === day.getDate()
                );
              }).length;
            });
            return (
              <button
                key={topic.id}
                className="rounded-2xl bg-white/72 p-5 text-left shadow-[0_14px_34px_rgba(45,43,37,0.045)] ring-1 ring-line/70 transition hover:bg-white"
                type="button"
                onClick={() => onOpenTopic(topic.id)}
              >
                <div className="mb-3 flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-semibold text-ink">{topic.name}</h3>
                    <div className="mt-1 text-xs text-muted">
                      {count} 条记录 · {latest ? `${formatMonthDay(latest.toISOString())} 更新` : "还在形成"}
                    </div>
                  </div>
                  <MiniSparkline values={values} />
                </div>
                <p className="text-sm leading-7 text-muted">{topic.summary}</p>
                {questions[0] && (
                  <p className="mt-3 rounded-xl bg-canvas px-3 py-2 text-sm leading-6 text-ink">
                    {questions[0]}
                  </p>
                )}
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}

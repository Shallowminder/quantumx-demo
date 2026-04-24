import {
  ArrowRight,
  BarChart3,
  CalendarRange,
  CircleHelp,
  Layers3,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { SevenDayTrace } from "../components/SevenDayTrace";
import { continueQuestions, insightMetrics } from "../data/mockData";
import type { SavedDistill, Thought, Topic, ViewKey } from "../types";

interface InsightsPageProps {
  savedDistills: SavedDistill[];
  thoughts: Thought[];
  topics: Topic[];
  onNavigate: (view: ViewKey) => void;
  onOpenTopic: (topicId: string) => void;
}

const weekBars = [
  { day: "周五", count: 4 },
  { day: "周六", count: 2 },
  { day: "周日", count: 3 },
  { day: "周一", count: 2 },
  { day: "周二", count: 3 },
  { day: "周三", count: 1 },
  { day: "今天", count: 5 },
];

export function InsightsPage({
  savedDistills,
  thoughts,
  topics,
  onNavigate,
  onOpenTopic,
}: InsightsPageProps) {
  const maxCount = Math.max(...weekBars.map((item) => item.count));
  const topicActivity = topics
    .map((topic) => ({
      topic,
      count: thoughts.filter((thought) => thought.topicIds.includes(topic.id)).length,
      inboxCount: thoughts.filter(
        (thought) => thought.topicIds.includes(topic.id) && thought.status === "inbox",
      ).length,
    }))
    .sort((a, b) => b.count - a.count);
  const topTopic = topicActivity[0]?.topic;
  const reactivatedThought = thoughts.find((thought) => thought.relatedIds.length >= 2);

  return (
    <div className="mx-auto max-w-6xl">
      <header className="mb-6">
        <div className="mb-2 flex items-center gap-2 text-sm text-muted">
          <CalendarRange size={16} strokeWidth={1.8} />
          最近 7 天
        </div>
        <h1 className="text-2xl font-semibold tracking-normal text-ink sm:text-3xl">
          个人洞察
        </h1>
      </header>

      <section className="grid gap-3 md:grid-cols-3">
        {insightMetrics.map((metric) => (
          <div
            key={metric.label}
            className="rounded-xl border border-line bg-white p-5 shadow-sm"
          >
            <div className="mb-2 text-sm text-muted">{metric.label}</div>
            <div className="mb-2 text-3xl font-semibold tracking-normal text-ink">
              {metric.value}
            </div>
            <p className="text-sm leading-6 text-muted">{metric.caption}</p>
          </div>
        ))}
      </section>

      <div className="mt-5">
        <SevenDayTrace savedDistills={savedDistills} thoughts={thoughts} />
        <button
          className="mt-3 inline-flex items-center gap-2 rounded-full bg-white/75 px-3 py-2 text-sm text-muted ring-1 ring-line/70 transition hover:text-ink"
          type="button"
          onClick={() => onNavigate("home")}
        >
          查看完整思考日历
          <ArrowRight size={14} strokeWidth={1.8} />
        </button>
      </div>

      <section className="mt-5 grid gap-4 md:grid-cols-2">
        <article className="rounded-xl border border-line bg-white p-5 shadow-soft">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink">
            <Sparkles size={17} strokeWidth={1.8} />
            本周你反复在想什么
          </div>
          <p className="text-sm leading-7 text-muted">
            你这周最活跃的主题是「{topTopic?.name ?? "长期主题"}」。记录里更关心的不是收集更多材料，而是把已有材料整理成可以继续写的结构。
          </p>
          <button
            className="mt-4 inline-flex items-center gap-2 rounded-md border border-line bg-canvas px-3 py-2 text-sm text-ink transition hover:border-sage/40 hover:bg-white"
            type="button"
            onClick={() => topTopic && onOpenTopic(topTopic.id)}
          >
            整理这个主题
            <ArrowRight size={15} strokeWidth={1.8} />
          </button>
        </article>

        <article className="rounded-xl border border-line bg-white p-5 shadow-soft">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink">
            <RotateCcw size={17} strokeWidth={1.8} />
            本周被重新激活的旧想法
          </div>
          <p className="text-sm leading-7 text-muted">
            「{reactivatedThought?.summary ?? "旧记录"}」最近又和新的记录连上了。它适合被放进一篇短文，或者作为下次复盘的开头。
          </p>
          <button
            className="mt-4 inline-flex items-center gap-2 rounded-md border border-line bg-canvas px-3 py-2 text-sm text-ink transition hover:border-sage/40 hover:bg-white"
            type="button"
            onClick={() => onNavigate("today")}
          >
            回到今日继续写
            <ArrowRight size={15} strokeWidth={1.8} />
          </button>
        </article>
      </section>

      <section className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="rounded-xl border border-line bg-white p-5 shadow-sm">
          <div className="mb-5 flex items-center gap-2 text-sm font-semibold text-ink">
            <CircleHelp size={17} strokeWidth={1.8} />
            本周值得继续写的问题
          </div>
          <div className="space-y-3">
            {continueQuestions.map((item) => {
              const topic = topics.find((candidate) => candidate.id === item.topicId);
              return (
                <article key={item.id} className="rounded-lg border border-line bg-canvas p-4">
                  <div className="mb-2 text-xs font-medium text-muted">
                    {topic?.name ?? "长期主题"}
                  </div>
                  <h2 className="mb-2 text-base font-semibold leading-6 text-ink">
                    {item.question}
                  </h2>
                  <p className="text-sm leading-6 text-muted">{item.note}</p>
                  <button
                    className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-sage"
                    type="button"
                    onClick={() => topic && onOpenTopic(topic.id)}
                  >
                    放到主题里看
                    <ArrowRight size={14} strokeWidth={1.8} />
                  </button>
                </article>
              );
            })}
          </div>
        </div>

        <div className="space-y-5">
          <div className="rounded-xl border border-line bg-white p-5 shadow-sm">
            <div className="mb-5 flex items-center gap-2 text-sm font-semibold text-ink">
              <Layers3 size={17} strokeWidth={1.8} />
              本周可以整理的主题
            </div>
            <div className="space-y-4">
              {topicActivity.map(({ topic, count, inboxCount }) => (
                <button
                  key={topic.id}
                  className="w-full text-left"
                  type="button"
                  onClick={() => onOpenTopic(topic.id)}
                >
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="font-medium text-ink">{topic.name}</span>
                    <span className="text-muted">
                      {count} 条 · {inboxCount} 条待整理
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-canvas">
                    <div
                      className="h-full rounded-full bg-sage/70"
                      style={{ width: `${Math.max(20, (count / thoughts.length) * 100)}%` }}
                    />
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-line bg-white p-5 shadow-sm">
            <div className="mb-5 flex items-center gap-2 text-sm font-semibold text-ink">
              <BarChart3 size={17} strokeWidth={1.8} />
              记录节奏
            </div>
            <div className="flex h-40 items-end gap-3">
              {weekBars.map((item) => (
                <div key={item.day} className="flex flex-1 flex-col items-center gap-2">
                  <div className="flex h-28 w-full items-end rounded-md bg-canvas px-2 pb-2">
                    <div
                      className="w-full rounded bg-clay/55"
                      style={{ height: `${Math.max(18, (item.count / maxCount) * 100)}%` }}
                    />
                  </div>
                  <div className="text-xs text-muted">{item.day}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

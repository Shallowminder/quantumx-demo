import { useEffect, useState } from "react";
import { Clock3, GitMerge, Layers3, Plus, Sprout } from "lucide-react";
import { MiniSparkline } from "../components/MiniSparkline";
import { TopicBadge } from "../components/TopicBadge";
import { TopicGrowthTimeline } from "../components/TopicGrowthTimeline";
import { formatMonthDay } from "../lib/date";
import type { SavedDistill, Thought, Topic } from "../types";

interface TopicsPageProps {
  savedDistills: SavedDistill[];
  selectedTopicId: string;
  thoughts: Thought[];
  topics: Topic[];
  onAddTopic: (name: string) => void;
  onAttachThoughtToTopic: (thoughtId: string, topicId: string) => void;
  onSelectTopic: (topicId: string) => void;
  onOpenThought: (thoughtId: string) => void;
  onRenameTopic: (topicId: string, name: string) => void;
}

export function TopicsPage({
  savedDistills,
  selectedTopicId,
  thoughts,
  topics,
  onAddTopic,
  onAttachThoughtToTopic,
  onSelectTopic,
  onOpenThought,
  onRenameTopic,
}: TopicsPageProps) {
  const [newTopicName, setNewTopicName] = useState("");
  const [topicNameDraft, setTopicNameDraft] = useState("");
  const selectedTopic = topics.find((topic) => topic.id === selectedTopicId) ?? topics[0];
  const getTopicThoughts = (topic: Topic) =>
    thoughts.filter(
      (thought) =>
        topic.thoughtIds.includes(thought.id) || thought.topicIds.includes(topic.id),
    );
  const topicThoughts = selectedTopic ? getTopicThoughts(selectedTopic) : [];
  const sortedTopicThoughts = [...topicThoughts].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
  const earliestThought = [...topicThoughts].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  )[0];
  const latestThought = sortedTopicThoughts[0];
  const inboxCount = topicThoughts.filter((thought) => thought.status === "inbox").length;
  const unattachedThoughts = selectedTopic
    ? thoughts
    .filter(
      (thought) =>
        thought.status === "inbox" && !thought.topicIds.includes(selectedTopic.id),
    )
    .slice(0, 4)
    : [];
  const growingQuestions = Array.from(
    new Set(topicThoughts.flatMap((thought) => thought.questions)),
  ).slice(0, 4);
  const mergeSuggestion =
    selectedTopic?.id === "ai-tools"
      ? "「AI 工具使用」和「写作方法」有几条记录都在讨论从素材到输出，后续可能适合合并部分材料。"
      : "暂时没有强合并建议，这个主题边界还比较清楚。";

  useEffect(() => {
    setTopicNameDraft(selectedTopic?.name ?? "");
  }, [selectedTopic?.name]);

  if (!selectedTopic) {
    return (
      <div className="frost-panel-strong rounded-[28px] p-6">
        <div className="mb-2 text-sm font-semibold text-ink">还没有主题</div>
        <p className="text-sm leading-7 text-muted">
          当前账号在这台设备上的本地主题还是空的。你可以先记录几条想法，让系统开始归类，或者手动新建一个主题。
        </p>
        <form
          className="mt-4 flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            onAddTopic(newTopicName);
            setNewTopicName("");
          }}
        >
          <input
            className="min-w-0 flex-1 rounded-xl border border-transparent bg-[rgba(247,244,238,0.92)] px-3.5 py-2.5 text-sm text-ink outline-none transition focus:border-white focus:bg-white"
            placeholder="例如：注意力管理"
            value={newTopicName}
            onChange={(event) => setNewTopicName(event.target.value)}
          />
          <button
            aria-label="新建主题"
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-ink text-white transition hover:bg-black"
            type="submit"
          >
            <Plus size={16} strokeWidth={1.8} />
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="grid gap-7 xl:grid-cols-[410px_minmax(0,1fr)]">
      <section>
        <header className="mb-6">
          <div className="mb-2 flex items-center gap-2 text-sm text-muted">
            <Layers3 size={16} strokeWidth={1.8} />
            自动归类
          </div>
          <h1 className="text-2xl font-semibold tracking-normal text-ink sm:text-3xl">
            主题沉淀
          </h1>
        </header>

        <form
          className="frost-panel mb-5 rounded-[24px] p-3.5"
          onSubmit={(event) => {
            event.preventDefault();
            onAddTopic(newTopicName);
            setNewTopicName("");
          }}
        >
          <div className="mb-2 text-sm font-semibold text-ink">新建主题</div>
          <div className="flex gap-2">
            <input
              className="min-w-0 flex-1 rounded-xl border border-transparent bg-[rgba(247,244,238,0.92)] px-3.5 py-2.5 text-sm text-ink outline-none transition focus:border-white focus:bg-white"
              placeholder="例如：注意力管理"
              value={newTopicName}
              onChange={(event) => setNewTopicName(event.target.value)}
            />
            <button
              aria-label="新建主题"
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-ink text-white transition hover:bg-black"
              type="submit"
            >
              <Plus size={16} strokeWidth={1.8} />
            </button>
          </div>
        </form>

        <div className="space-y-3">
          {topics.map((topic) => {
            const active = topic.id === selectedTopic.id;
            const topicRecords = getTopicThoughts(topic);
            const dynamicInboxCount = topicRecords.filter(
              (thought) => thought.status === "inbox",
            ).length;
            const latestRecord = [...topicRecords].sort(
              (a, b) =>
                new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
            )[0];
            const sparkValues = Array.from({ length: 7 }).map((_, index) => {
              const day = new Date();
              day.setDate(day.getDate() - (6 - index));
              return topicRecords.filter((thought) => {
                const created = new Date(thought.createdAt);
                return (
                  created.getFullYear() === day.getFullYear() &&
                  created.getMonth() === day.getMonth() &&
                  created.getDate() === day.getDate()
                );
              }).length;
            });
            return (
              <button
                key={topic.id}
                className={`w-full rounded-[24px] p-4 text-left transition ${
                  active
                    ? "frost-panel-strong"
                    : "frost-panel hover:bg-white/86"
                }`}
                type="button"
                onClick={() => onSelectTopic(topic.id)}
              >
                <div className="mb-3 flex items-start justify-between gap-3">
                  <TopicBadge topic={topic} />
                  <span className="rounded-full bg-[rgba(247,244,238,0.92)] px-2.5 py-1 text-xs text-muted">
                    {topicRecords.length} 条记录
                  </span>
                </div>
                <p className="mb-3 text-sm leading-6 text-ink">{topic.summary}</p>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                  <span className="inline-flex items-center gap-1">
                    <Clock3 size={13} strokeWidth={1.8} />
                    {latestRecord ? formatMonthDay(latestRecord.createdAt) : formatMonthDay(topic.updatedAt)}
                  </span>
                  {dynamicInboxCount > 0 && <span>{dynamicInboxCount} 条待整理</span>}
                  {topicRecords.length >= 3 && <span>最近在变热</span>}
                  <MiniSparkline values={sparkValues} />
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <section className="frost-panel-strong rounded-[30px] p-5 sm:p-6">
        <div className="mb-6 flex flex-col gap-3 border-b border-white/70 pb-6 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <TopicBadge topic={selectedTopic} />
            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
              <input
                className="min-w-0 rounded-[18px] border border-transparent bg-transparent px-0 py-1 text-2xl font-semibold tracking-normal text-ink outline-none transition focus:border-white focus:bg-[rgba(247,244,238,0.88)] focus:px-3"
                value={topicNameDraft}
                onChange={(event) => setTopicNameDraft(event.target.value)}
                onBlur={() => onRenameTopic(selectedTopic.id, topicNameDraft)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    onRenameTopic(selectedTopic.id, topicNameDraft);
                    event.currentTarget.blur();
                  }
                }}
              />
            </div>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-muted">
              {selectedTopic.description}
            </p>
          </div>
          <div className="rounded-full bg-[rgba(247,244,238,0.92)] px-3.5 py-2 text-sm text-muted">
            {topicThoughts.length} 条相关记录
          </div>
        </div>

        <div className="mb-6 grid gap-3 md:grid-cols-3">
          <div className="rounded-[22px] bg-[rgba(247,244,238,0.92)] p-4">
            <div className="mb-1 text-xs text-muted">最早记录</div>
            <div className="text-sm font-medium text-ink">
              {earliestThought ? formatMonthDay(earliestThought.createdAt) : "暂无"}
            </div>
          </div>
          <div className="rounded-[22px] bg-[rgba(247,244,238,0.92)] p-4">
            <div className="mb-1 text-xs text-muted">最近更新</div>
            <div className="text-sm font-medium text-ink">
              {latestThought ? formatMonthDay(latestThought.createdAt) : "暂无"}
            </div>
          </div>
          <div className="rounded-[22px] bg-[rgba(247,244,238,0.92)] p-4">
            <div className="mb-1 text-xs text-muted">待整理材料</div>
            <div className="text-sm font-medium text-ink">{inboxCount} 条</div>
          </div>
        </div>

        <TopicGrowthTimeline
          savedDistills={savedDistills}
          thoughts={thoughts}
          topic={selectedTopic}
        />

        <div className="mb-6">
          <div className="mb-3 text-sm font-semibold text-ink">系统看到的线索</div>
          <div className="flex flex-wrap gap-2">
            {selectedTopic.signals.map((signal) => (
              <span
                key={signal}
                className="rounded-full bg-[rgba(247,244,238,0.92)] px-3 py-1.5 text-sm text-muted"
              >
                {signal}
              </span>
            ))}
          </div>
        </div>

        <div className="frost-panel mb-6 rounded-[24px] p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink">
            <Sprout size={16} strokeWidth={1.8} />
            正在长出的问题
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            {growingQuestions.map((question) => (
              <div key={question} className="rounded-[18px] bg-white/88 px-3 py-2.5 text-sm leading-6 text-ink">
                {question}
              </div>
            ))}
          </div>
        </div>

        <div className="frost-panel mb-6 rounded-[24px] p-4">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-ink">
            <GitMerge size={16} strokeWidth={1.8} />
            主题整理建议
          </div>
          <p className="text-sm leading-7 text-muted">{mergeSuggestion}</p>
        </div>

        {unattachedThoughts.length > 0 && (
          <div className="frost-panel mb-6 rounded-[24px] p-4">
            <div className="mb-3 text-sm font-semibold text-ink">
              可以加入这个主题的想法
            </div>
            <div className="grid gap-2 md:grid-cols-2">
              {unattachedThoughts.map((thought) => (
                <article key={thought.id} className="rounded-[20px] bg-[rgba(247,244,238,0.92)] p-3.5">
                  <p className="line-clamp-3 text-sm leading-6 text-ink">{thought.content}</p>
                  <button
                    className="mt-3 rounded-xl bg-white/80 px-3 py-1.5 text-xs text-muted transition hover:bg-white hover:text-ink"
                    type="button"
                    onClick={() => onAttachThoughtToTopic(thought.id, selectedTopic.id)}
                  >
                    加入「{selectedTopic.name}」
                  </button>
                </article>
              ))}
            </div>
          </div>
        )}

        <div>
          <div className="mb-3 text-sm font-semibold text-ink">关键记录</div>
          <div className="space-y-3">
            {sortedTopicThoughts.map((thought) => (
              <button
                key={thought.id}
                className="w-full rounded-[22px] bg-[rgba(247,244,238,0.92)] p-4 text-left transition hover:bg-white"
                type="button"
                onClick={() => onOpenThought(thought.id)}
              >
                <div className="mb-2 text-xs text-muted">
                  {formatMonthDay(thought.createdAt)} · {thought.source}
                </div>
                <p className="text-sm leading-7 text-ink">{thought.content}</p>
              </button>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

import { useMemo, useState } from "react";
import { ArrowRight, CalendarDays, Inbox, RotateCcw, X } from "lucide-react";
import { CaptureComposer } from "../components/CaptureComposer";
import { RelatedMemoriesPanel } from "../components/RelatedMemoriesPanel";
import { ThoughtCard } from "../components/ThoughtCard";
import { findRelatedMemoryMatches, inferTopicIds } from "../lib/memory";
import type { Thought, Topic } from "../types";

interface TodayPageProps {
  draft: string;
  focusCaptureSignal: number;
  thoughts: Thought[];
  topics: Topic[];
  onCapture: (content: string) => void;
  onDraftChange: (value: string) => void;
  onContinueFromThought: (thought: Thought) => void;
  onRequestCaptureFocus: () => void;
  onOpenThought: (thoughtId: string) => void;
  onOpenTopic: (topicId: string) => void;
}

export function TodayPage({
  draft,
  focusCaptureSignal,
  thoughts,
  topics,
  onCapture,
  onDraftChange,
  onContinueFromThought,
  onRequestCaptureFocus,
  onOpenThought,
  onOpenTopic,
}: TodayPageProps) {
  const [briefDismissed, setBriefDismissed] = useState(false);
  const todayLabel = new Date().toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const relatedMatches = useMemo(() => {
    const input = draft.trim().length > 0 ? draft : thoughts[0]?.content ?? "";
    return findRelatedMemoryMatches(input, thoughts, topics, 5);
  }, [draft, thoughts, topics]);

  const todayThoughts = thoughts.slice(0, 7);
  const inboxThoughts = thoughts
    .filter((thought) => thought.status === "inbox")
    .slice(0, 4);
  const recalledThoughts = relatedMatches
    .map((match) => match.thought)
    .filter((thought) => !todayThoughts.some((item) => item.id === thought.id))
    .slice(0, 3);
  const suggestedTopics =
    draft.trim().length > 8
      ? topics.filter((topic) => inferTopicIds(draft, topics).includes(topic.id))
      : [];
  const briefThought =
    thoughts.find((thought) => thought.status === "inbox" && thought.relatedIds.length > 0) ??
    thoughts.find((thought) => thought.relatedIds.length > 1) ??
    thoughts[0];
  const briefTopic = topics.find((topic) => briefThought?.topicIds.includes(topic.id));

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <section className="min-w-0">
        <header className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm text-muted">
              <CalendarDays size={16} strokeWidth={1.8} />
              {todayLabel}
            </div>
            <h1 className="text-2xl font-semibold tracking-normal text-ink sm:text-3xl">
              今日思考
            </h1>
          </div>
          <div className="rounded-full border border-line bg-white px-3 py-1.5 text-sm text-muted">
            {thoughts.length} 条记录 · {topics.length} 个长期主题
          </div>
        </header>

        <CaptureComposer
          draft={draft}
          focusSignal={focusCaptureSignal}
          relatedCount={relatedMatches.length}
          suggestedTopics={suggestedTopics}
          onCapture={(value) => {
            onCapture(value);
          }}
          onDraftChange={onDraftChange}
        />

        {thoughts.length === 0 && (
          <section className="mt-4 rounded-xl border border-line bg-white p-5 shadow-sm">
            <div className="mb-2 text-sm font-semibold text-ink">先从第一条想法开始</div>
            <p className="text-sm leading-7 text-muted">
              这台设备当前还没有本地记录。你可以先写下一句最近在想的事，或者先去右侧登录后从云端恢复已有内容。
            </p>
          </section>
        )}

        {!briefDismissed && briefThought && (
          <section className="mt-4 rounded-xl border border-line bg-white p-4 shadow-sm">
            <div className="mb-2 flex items-start justify-between gap-3">
              <div>
                <div className="mb-1 text-sm font-semibold text-ink">
                  今天可以从这里继续
                </div>
                <p className="text-sm leading-7 text-muted">
                  你留下过一条关于「{briefTopic?.name ?? "长期主题"}」的记录：
                  <span className="text-ink">“{briefThought.summary}”</span>
                  。它已经和 {briefThought.relatedIds.length} 条旧想法连上了。
                </p>
              </div>
              <button
                aria-label="稍后处理"
                className="rounded-md p-1 text-muted transition hover:bg-canvas hover:text-ink"
                type="button"
                onClick={() => setBriefDismissed(true)}
              >
                <X size={16} strokeWidth={1.8} />
              </button>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                className="inline-flex items-center gap-2 rounded-md bg-ink px-3 py-2 text-sm font-medium text-white transition hover:bg-black"
                type="button"
                onClick={() => onContinueFromThought(briefThought)}
              >
                继续写
                <ArrowRight size={15} strokeWidth={1.8} />
              </button>
              {briefTopic && (
                <button
                  className="rounded-md border border-line bg-canvas px-3 py-2 text-sm text-ink transition hover:border-sage/40 hover:bg-white"
                  type="button"
                  onClick={() => onOpenTopic(briefTopic.id)}
                >
                  放到主题里看
                </button>
              )}
              <button
                className="rounded-md border border-line bg-white px-3 py-2 text-sm text-muted transition hover:text-ink"
                type="button"
                onClick={() => {
                  onRequestCaptureFocus();
                  setBriefDismissed(true);
                }}
              >
                先记新的
              </button>
            </div>
          </section>
        )}

        {inboxThoughts.length > 0 && (
          <div className="mt-6 rounded-xl border border-line bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-ink">
                <Inbox size={16} strokeWidth={1.8} />
                还没安顿好的想法
              </div>
              <span className="text-xs text-muted">先接住，稍后再整理</span>
            </div>
            <div className="grid gap-2 md:grid-cols-2">
              {inboxThoughts.map((thought) => (
                <button
                  key={thought.id}
                  className="rounded-lg border border-line bg-canvas p-3 text-left text-sm leading-6 text-ink transition hover:border-sage/35 hover:bg-white"
                  type="button"
                  onClick={() => onOpenThought(thought.id)}
                >
                  {thought.content}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="mt-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold text-ink">最近记录</h2>
            <span className="text-sm text-muted">自动关联，不强制分类</span>
          </div>
          <div className="space-y-3">
            {todayThoughts.length > 0 ? (
              todayThoughts.map((thought) => (
                <ThoughtCard
                  key={thought.id}
                  thought={thought}
                  topics={topics}
                  onOpen={onOpenThought}
                />
              ))
            ) : (
              <div className="rounded-xl border border-line bg-white p-4 text-sm leading-7 text-muted">
                还没有最近记录。先写下一句，QuantumX 才会开始把旧想法、主题和后续整理慢慢带出来。
              </div>
            )}
          </div>
        </div>

        {recalledThoughts.length > 0 && (
          <div className="mt-6">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2 text-base font-semibold text-ink">
                <RotateCcw size={17} strokeWidth={1.8} />
                今天被带回来的旧想法
              </div>
              <span className="text-sm text-muted">和当前思考有关</span>
            </div>
            <div className="space-y-3">
              {recalledThoughts.map((thought) => (
                <ThoughtCard
                  key={thought.id}
                  thought={thought}
                  topics={topics}
                  onOpen={onOpenThought}
                />
              ))}
            </div>
          </div>
        )}
      </section>

      <div className="xl:sticky xl:top-6 xl:h-[calc(100vh-3rem)] xl:overflow-auto xl:pr-1 subtle-scrollbar">
        <RelatedMemoriesPanel
          description={
            draft.trim().length > 0
              ? "根据你正在写的内容，先把可能有用的旧记录放到旁边。"
              : "先展示和最新记录相关的旧想法，继续输入时会实时更新。"
          }
          matches={relatedMatches}
          topics={topics}
          onOpenThought={onOpenThought}
          onOpenTopic={onOpenTopic}
        />
      </div>
    </div>
  );
}

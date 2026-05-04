import { useEffect, useMemo, useState } from "react";
import {
  Archive,
  ArrowLeft,
  BookOpenText,
  CheckCircle2,
  FileText,
  HelpCircle,
  Link2,
  PenLine,
} from "lucide-react";
import { MemoryMatchCard } from "../components/MemoryMatchCard";
import { ThoughtStatusTrail } from "../components/ThoughtStatusTrail";
import { TopicBadge } from "../components/TopicBadge";
import { formatDayLabel } from "../lib/date";
import { findRelatedMemoryMatches } from "../lib/memory";
import {
  fetchRelatedMemoryResult,
  type RecallSource,
  type RecallStrategy,
} from "../services/recallRepository";
import { useMemoryFeedback } from "../hooks/useMemoryFeedback";
import type {
  MemoryMatch,
  Thought,
  ThoughtStatus,
  Topic,
} from "../types";

interface ThoughtDetailPageProps {
  thought: Thought;
  thoughts: Thought[];
  topics: Topic[];
  onBack: () => void;
  onAttachThoughtToTopic: (thoughtId: string, topicId: string) => void;
  onContinueFromThought: (thought: Thought) => void;
  onGenerateFromThought: (thought: Thought) => void;
  onOpenThought: (thoughtId: string) => void;
  onOpenTopic: (topicId: string) => void;
  onUpdateThought: (thoughtId: string, patch: Partial<Thought>) => void;
}

const statusLabels: Record<ThoughtStatus, string> = {
  inbox: "未整理",
  linked: "已关联",
  themed: "已加入主题",
  distilled: "已用于蒸馏",
  archived: "已归档",
};

const strategyLabels: Record<RecallStrategy, string> = {
  local: "本地规则",
  lexical: "关键词召回",
  semantic: "语义召回",
  empty: "暂无结果",
};

export function ThoughtDetailPage({
  thought,
  thoughts,
  topics,
  onBack,
  onAttachThoughtToTopic,
  onContinueFromThought,
  onGenerateFromThought,
  onOpenThought,
  onOpenTopic,
  onUpdateThought,
}: ThoughtDetailPageProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [contentDraft, setContentDraft] = useState(thought.content);
  const [summaryDraft, setSummaryDraft] = useState(thought.summary);
  const [selectedTopicIds, setSelectedTopicIds] = useState(thought.topicIds);
  const thoughtTopics = topics.filter((topic) => thought.topicIds.includes(topic.id));
  const localRelatedMatches = useMemo(
    () => findRelatedMemoryMatches(thought, thoughts, topics, 5),
    [thought, thoughts, topics],
  );
  const [relatedMatches, setRelatedMatches] =
    useState<MemoryMatch[]>(localRelatedMatches);
  const [recallSource, setRecallSource] = useState<RecallSource>("local");
  const [recallStrategy, setRecallStrategy] = useState<RecallStrategy>("local");
  const [recallLoading, setRecallLoading] = useState(false);
  const { feedback: memoryFeedback, persistFeedback } = useMemoryFeedback();

  useEffect(() => {
    setContentDraft(thought.content);
    setSummaryDraft(thought.summary);
    setSelectedTopicIds(thought.topicIds);
    setIsEditing(false);
  }, [thought]);

  useEffect(() => {
    let cancelled = false;
    setRelatedMatches(localRelatedMatches);
    setRecallSource("local");
    setRecallStrategy("local");
    setRecallLoading(thought.content.trim().length >= 2 && thoughts.length > 0);

    const timer = window.setTimeout(async () => {
      const result = await fetchRelatedMemoryResult(thought, thoughts, topics, 5);
      if (!cancelled) {
        setRelatedMatches(result.matches);
        setRecallSource(result.source);
        setRecallStrategy(result.strategy);
        setRecallLoading(false);
      }
    }, 120);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [localRelatedMatches, thought, thoughts, topics]);

  function saveEdits() {
    onUpdateThought(thought.id, {
      content: contentDraft.trim(),
      summary: summaryDraft.trim(),
      topicIds: selectedTopicIds,
      status: selectedTopicIds.length > 0 ? "themed" : thought.status,
    });
  }

  function toggleTopic(topicId: string) {
    setSelectedTopicIds((current) =>
      current.includes(topicId)
        ? current.filter((id) => id !== topicId)
        : [...current, topicId],
    );
  }

  function renderRelatedMemories() {
    const recallLabel = recallLoading
      ? "匹配中"
      : recallSource === "cloud"
        ? strategyLabels[recallStrategy]
        : "本地规则";

    return (
      <aside className="space-y-4">
        <section className="frost-panel rounded-[28px] p-4">
          <div className="mb-1 flex items-start justify-between gap-3">
            <div className="text-sm font-semibold text-ink">相关旧想法</div>
            <span className="theme-pill shrink-0 rounded-full px-2.5 py-1 text-[11px] text-muted">
              {recallLabel}
            </span>
          </div>
          <p className="mb-4 text-sm leading-6 text-muted">
            这些旧记录和当前想法有相同主题或相近关键词。
          </p>

          {relatedMatches.length > 0 ? (
            <div className="space-y-2">
              {relatedMatches.map((match) => (
                <MemoryMatchCard
                  key={match.thought.id}
                  compact
                  match={match}
                  selectedFeedback={memoryFeedback[match.thought.id] ?? null}
                  showFeedback
                  onFeedback={(thoughtId, feedbackType) => {
                    void persistFeedback(thoughtId, {
                      feedbackType,
                      sourceThoughtId: thought.id,
                      context: thought.content,
                    });
                  }}
                  onOpenThought={onOpenThought}
                />
              ))}
            </div>
          ) : (
            <div className="theme-card-soft rounded-[22px] p-3.5 text-sm leading-6 text-muted">
              暂时还没有足够接近的旧想法。继续写几句，或者多记录几天后，这里会更有用。
            </div>
          )}
        </section>
      </aside>
    );
  }

  return (
    <div className="grid gap-7 xl:grid-cols-[minmax(0,1fr)_360px]">
      <section className="min-w-0">
        <button
          className="theme-button-muted mb-6 inline-flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm transition"
          type="button"
          onClick={onBack}
        >
          <ArrowLeft size={16} strokeWidth={1.8} />
          返回今日
        </button>

        <article className="frost-panel-strong rounded-[30px] p-5 sm:p-7">
          <div className="mb-4 flex flex-wrap items-center gap-2 text-sm text-muted">
            <span>{formatDayLabel(thought.createdAt)}</span>
            <span className="h-1 w-1 rounded-full bg-muted/40" />
            <span>{thought.source}</span>
            <span className="theme-chip-soft rounded-full px-2.5 py-1 text-xs">
              {statusLabels[thought.status]}
            </span>
          </div>

          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h1 className="text-2xl font-semibold tracking-normal text-ink">
              想法详情
            </h1>
            <button
              className="theme-button-secondary inline-flex items-center justify-center gap-2 rounded-xl px-3.5 py-2.5 text-sm transition"
              type="button"
              onClick={() => setIsEditing((value) => !value)}
            >
              <PenLine size={15} strokeWidth={1.8} />
              {isEditing ? "取消编辑" : "编辑"}
            </button>
          </div>

          {isEditing ? (
            <div className="space-y-4">
              <textarea
                className="theme-input min-h-44 w-full resize-y rounded-[24px] px-4 py-3 text-[16px] leading-8 text-ink outline-none transition"
                value={contentDraft}
                onChange={(event) => setContentDraft(event.target.value)}
              />
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-ink">摘要</span>
                <input
                  className="theme-input w-full rounded-[18px] px-3.5 py-2.5 text-sm text-ink outline-none transition"
                  value={summaryDraft}
                  onChange={(event) => setSummaryDraft(event.target.value)}
                />
              </label>
              <div>
                <div className="mb-2 text-sm font-medium text-ink">加入主题</div>
                <div className="flex flex-wrap gap-2">
                  {topics.map((topic) => {
                    const checked = selectedTopicIds.includes(topic.id);
                    return (
                      <button
                        key={topic.id}
                        className={`rounded-full px-3.5 py-2 text-sm transition ${
                          checked
                            ? "theme-primary-button"
                            : "theme-button-muted"
                        }`}
                        type="button"
                        onClick={() => toggleTopic(topic.id)}
                      >
                        {topic.name}
                      </button>
                    );
                  })}
                </div>
              </div>
              <button
                className="theme-primary-button inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition"
                type="button"
                onClick={() => {
                  saveEdits();
                  setIsEditing(false);
                }}
              >
                <CheckCircle2 size={16} strokeWidth={1.8} />
                保存修改
              </button>
            </div>
          ) : (
            <>
              <p className="whitespace-pre-wrap text-[17px] leading-8 text-ink">
                {thought.content}
              </p>

              <div className="mt-6 flex flex-wrap gap-2">
                {thoughtTopics.map((topic) => (
                  <button key={topic.id} type="button" onClick={() => onOpenTopic(topic.id)}>
                    <TopicBadge topic={topic} />
                  </button>
                ))}
              </div>
            </>
          )}

          <div className="mt-6 flex flex-wrap gap-2 border-t soft-divider pt-4">
            <button
              className="theme-button-secondary rounded-xl px-3.5 py-2.5 text-sm transition"
              type="button"
              onClick={() => onContinueFromThought(thought)}
            >
              从这条继续写
            </button>
            <button
              className="theme-button-secondary inline-flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm transition"
              type="button"
              onClick={() => onGenerateFromThought(thought)}
            >
              <BookOpenText size={15} strokeWidth={1.8} />
              生成草稿
            </button>
            <button
              className="theme-button-secondary inline-flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm transition"
              type="button"
              onClick={() => onUpdateThought(thought.id, { status: "themed" })}
            >
              <CheckCircle2 size={15} strokeWidth={1.8} />
              标记已整理
            </button>
            <button
              className="theme-button-muted inline-flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm transition"
              type="button"
              onClick={() => onUpdateThought(thought.id, { status: "archived" })}
            >
              <Archive size={15} strokeWidth={1.8} />
              归档
            </button>
          </div>
        </article>

        <div className="mt-4">
          <ThoughtStatusTrail thought={thought} />
        </div>

        <div className="mt-4 xl:hidden">
          {renderRelatedMemories()}
        </div>

        <section className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="frost-panel rounded-[24px] p-5">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink">
              <FileText size={16} strokeWidth={1.8} />
              自动摘要
            </div>
            <p className="text-sm leading-7 text-muted">{thought.summary}</p>
          </div>

          <div className="frost-panel rounded-[24px] p-5">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink">
              <HelpCircle size={16} strokeWidth={1.8} />
              可以继续写
            </div>
            <div className="space-y-2">
              {thought.questions.map((question) => (
                <p key={question} className="theme-card-soft rounded-[18px] px-3 py-2.5 text-sm leading-6 text-ink">
                  {question}
                </p>
              ))}
            </div>
          </div>
        </section>

        <section className="frost-panel rounded-[24px] p-5">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink">
            <Link2 size={16} strokeWidth={1.8} />
            所属主题
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {thoughtTopics.map((topic) => (
              <button
                key={topic.id}
                className="theme-card-soft rounded-[20px] p-4 text-left transition"
                type="button"
                onClick={() => onOpenTopic(topic.id)}
              >
                <div className="mb-1 text-sm font-semibold text-ink">{topic.name}</div>
                <p className="text-sm leading-6 text-muted">{topic.summary}</p>
              </button>
            ))}
            {topics
              .filter((topic) => !thought.topicIds.includes(topic.id))
              .slice(0, 2)
              .map((topic) => (
                <button
                  key={topic.id}
                  className="theme-card-overlay rounded-[20px] border border-dashed border-line/70 p-4 text-left transition hover:text-ink"
                  type="button"
                  onClick={() => onAttachThoughtToTopic(thought.id, topic.id)}
                >
                  <div className="mb-1 text-sm font-semibold text-ink">
                    加入「{topic.name}」
                  </div>
                  <p className="text-sm leading-6 text-muted">把这条想法放进同一主题继续沉淀。</p>
                </button>
              ))}
          </div>
        </section>
      </section>

      <div className="hidden xl:block xl:sticky xl:top-6 xl:h-[calc(100vh-3rem)] xl:overflow-auto xl:pr-1 subtle-scrollbar">
        {renderRelatedMemories()}
      </div>
    </div>
  );
}

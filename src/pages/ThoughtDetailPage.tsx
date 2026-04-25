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
import { RelatedMemoriesPanel } from "../components/RelatedMemoriesPanel";
import { ThoughtStatusTrail } from "../components/ThoughtStatusTrail";
import { TopicBadge } from "../components/TopicBadge";
import { formatDayLabel } from "../lib/date";
import { findRelatedMemoryMatches } from "../lib/memory";
import { fetchRelatedMemoryMatches } from "../services/recallRepository";
import type { MemoryMatch, Thought, ThoughtStatus, Topic } from "../types";

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

  useEffect(() => {
    setContentDraft(thought.content);
    setSummaryDraft(thought.summary);
    setSelectedTopicIds(thought.topicIds);
    setIsEditing(false);
  }, [thought]);

  useEffect(() => {
    let cancelled = false;
    setRelatedMatches(localRelatedMatches);

    const timer = window.setTimeout(async () => {
      const nextMatches = await fetchRelatedMemoryMatches(thought, thoughts, topics, 5);
      if (!cancelled) {
        setRelatedMatches(nextMatches);
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

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <section className="min-w-0">
        <button
          className="mb-5 inline-flex items-center gap-2 rounded-md border border-line bg-white px-3 py-2 text-sm text-muted transition hover:text-ink"
          type="button"
          onClick={onBack}
        >
          <ArrowLeft size={16} strokeWidth={1.8} />
          返回今日
        </button>

        <article className="rounded-xl border border-line bg-white p-5 shadow-soft sm:p-7">
          <div className="mb-4 flex flex-wrap items-center gap-2 text-sm text-muted">
            <span>{formatDayLabel(thought.createdAt)}</span>
            <span className="h-1 w-1 rounded-full bg-muted/40" />
            <span>{thought.source}</span>
            <span className="rounded-full border border-line bg-canvas px-2 py-0.5 text-xs">
              {statusLabels[thought.status]}
            </span>
          </div>

          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h1 className="text-2xl font-semibold tracking-normal text-ink">
              想法详情
            </h1>
            <button
              className="inline-flex items-center justify-center gap-2 rounded-md border border-line bg-canvas px-3 py-2 text-sm text-ink transition hover:border-sage/40 hover:bg-white"
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
                className="min-h-44 w-full resize-y rounded-xl border border-line bg-canvas px-4 py-3 text-[16px] leading-8 text-ink outline-none transition focus:border-sage/50 focus:bg-white"
                value={contentDraft}
                onChange={(event) => setContentDraft(event.target.value)}
              />
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-ink">摘要</span>
                <input
                  className="w-full rounded-lg border border-line bg-canvas px-3 py-2 text-sm text-ink outline-none transition focus:border-sage/50 focus:bg-white"
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
                        className={`rounded-full border px-3 py-1.5 text-sm transition ${
                          checked
                            ? "border-ink bg-ink text-white"
                            : "border-line bg-canvas text-muted hover:text-ink"
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
                className="inline-flex items-center gap-2 rounded-md bg-ink px-4 py-2 text-sm font-medium text-white transition hover:bg-black"
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

          <div className="mt-6 flex flex-wrap gap-2 border-t border-line pt-4">
            <button
              className="rounded-md border border-line bg-canvas px-3 py-2 text-sm text-ink transition hover:border-sage/40 hover:bg-white"
              type="button"
              onClick={() => onContinueFromThought(thought)}
            >
              从这条继续写
            </button>
            <button
              className="inline-flex items-center gap-2 rounded-md border border-line bg-canvas px-3 py-2 text-sm text-ink transition hover:border-sage/40 hover:bg-white"
              type="button"
              onClick={() => onGenerateFromThought(thought)}
            >
              <BookOpenText size={15} strokeWidth={1.8} />
              生成草稿
            </button>
            <button
              className="inline-flex items-center gap-2 rounded-md border border-line bg-canvas px-3 py-2 text-sm text-ink transition hover:border-sage/40 hover:bg-white"
              type="button"
              onClick={() => onUpdateThought(thought.id, { status: "themed" })}
            >
              <CheckCircle2 size={15} strokeWidth={1.8} />
              标记已整理
            </button>
            <button
              className="inline-flex items-center gap-2 rounded-md border border-line bg-white px-3 py-2 text-sm text-muted transition hover:text-ink"
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

        <section className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-line bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink">
              <FileText size={16} strokeWidth={1.8} />
              自动摘要
            </div>
            <p className="text-sm leading-7 text-muted">{thought.summary}</p>
          </div>

          <div className="rounded-xl border border-line bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink">
              <HelpCircle size={16} strokeWidth={1.8} />
              可以继续写
            </div>
            <div className="space-y-2">
              {thought.questions.map((question) => (
                <p key={question} className="rounded-lg bg-canvas px-3 py-2 text-sm leading-6 text-ink">
                  {question}
                </p>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-4 rounded-xl border border-line bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink">
            <Link2 size={16} strokeWidth={1.8} />
            所属主题
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {thoughtTopics.map((topic) => (
              <button
                key={topic.id}
                className="rounded-lg border border-line bg-canvas p-4 text-left transition hover:border-sage/35 hover:bg-white"
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
                  className="rounded-lg border border-dashed border-line bg-white p-4 text-left transition hover:border-sage/35 hover:bg-canvas"
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

      <div className="xl:sticky xl:top-6 xl:h-[calc(100vh-3rem)] xl:overflow-auto xl:pr-1 subtle-scrollbar">
        <RelatedMemoriesPanel
          description="这些旧记录和当前想法有相同主题或相近关键词。"
          matches={relatedMatches}
          title="相关旧想法"
          topics={topics}
          onAttachToTopic={(_, topicId) => onAttachThoughtToTopic(thought.id, topicId)}
          onOpenThought={onOpenThought}
          onOpenTopic={onOpenTopic}
        />
      </div>
    </div>
  );
}

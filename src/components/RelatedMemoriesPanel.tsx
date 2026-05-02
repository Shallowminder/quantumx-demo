import { useState } from "react";
import { Check, Clock3, Layers3, Pin, X } from "lucide-react";
import { MemoryRecallExplanation } from "./MemoryRecallExplanation";
import { formatMonthDay } from "../lib/date";
import { recordMemoryFeedback } from "../services/memoryFeedbackRepository";
import type { RecallSource, RecallStrategy } from "../services/recallRepository";
import type { MemoryFeedbackType, MemoryMatch, MemoryMatchKind, Topic } from "../types";

interface RelatedMemoriesPanelProps {
  title?: string;
  description?: string;
  matches: MemoryMatch[];
  topics: Topic[];
  feedbackContext?: string;
  isLoading?: boolean;
  recallSource?: RecallSource;
  recallStrategy?: RecallStrategy;
  sourceThoughtId?: string;
  onAttachToTopic?: (thoughtId: string, topicId: string) => void;
  onOpenThought: (thoughtId: string) => void;
  onOpenTopic: (topicId: string) => void;
}

const kindLabels: Record<MemoryMatchKind, string> = {
  direct: "直接相关",
  similar: "相似问题",
  counterpoint: "不同角度",
};

const strategyLabels: Record<RecallStrategy, string> = {
  local: "本地规则",
  lexical: "关键词召回",
  semantic: "语义召回",
  empty: "暂无结果",
};

export function RelatedMemoriesPanel({
  title = "相关旧想法",
  description = "根据你正在写的内容，从历史记录里找回。",
  matches,
  topics,
  feedbackContext,
  isLoading = false,
  recallSource = "local",
  recallStrategy = "local",
  sourceThoughtId,
  onAttachToTopic,
  onOpenThought,
  onOpenTopic,
}: RelatedMemoriesPanelProps) {
  const [feedback, setFeedback] = useState<Record<string, string>>({});
  const [pinnedIds, setPinnedIds] = useState<string[]>([]);
  const topicIds = Array.from(
    new Set(matches.flatMap((match) => match.thought.topicIds)),
  );
  const relatedTopics = topics.filter((topic) => topicIds.includes(topic.id));
  const sortedMatches = [
    ...matches.filter((match) => pinnedIds.includes(match.thought.id)),
    ...matches.filter((match) => !pinnedIds.includes(match.thought.id)),
  ];
  const groupedMatches = (["direct", "similar", "counterpoint"] as const)
    .map((kind) => ({
      kind,
      matches: sortedMatches.filter((match) => match.kind === kind),
    }))
    .filter((group) => group.matches.length > 0);

  function persistFeedback(thoughtId: string, feedbackType: MemoryFeedbackType) {
    void recordMemoryFeedback({
      feedbackType,
      targetThoughtId: thoughtId,
      sourceThoughtId,
      context: feedbackContext,
    }).catch(() => {
      // Keep interaction lightweight if cloud feedback write fails.
    });
  }

  return (
    <aside className="space-y-4">
      <section className="frost-panel rounded-[28px] p-4">
        <div className="mb-1 flex items-start justify-between gap-3">
          <div className="text-sm font-semibold text-ink">{title}</div>
          <span className="theme-pill shrink-0 rounded-full px-2.5 py-1 text-[11px] text-muted">
            {isLoading
              ? "匹配中"
              : recallSource === "cloud"
                ? strategyLabels[recallStrategy]
                : "本地规则"}
          </span>
        </div>
        <p className="mb-4 text-sm leading-6 text-muted">{description}</p>
        <div className="space-y-3">
          {groupedMatches.length > 0 ? (
            groupedMatches.map((group) => (
              <div key={group.kind}>
                <div className="mb-2 text-xs font-medium text-muted">
                  {kindLabels[group.kind]}
                </div>
                <div className="space-y-2">
                  {group.matches.map((match) => (
                    <article
                      key={match.thought.id}
                      className="theme-card-soft w-full rounded-[22px] p-3.5 text-left transition"
                    >
                      <button
                        className="w-full text-left"
                        type="button"
                        onClick={() => onOpenThought(match.thought.id)}
                      >
                        <div className="mb-2 flex items-center gap-2 text-xs text-muted">
                          <Clock3 size={13} strokeWidth={1.8} />
                          <span>{formatMonthDay(match.thought.createdAt)}</span>
                          <span>{match.thought.source}</span>
                          {pinnedIds.includes(match.thought.id) && <span>已固定</span>}
                        </div>
                        <p className="line-clamp-3 text-sm leading-6 text-ink">
                          {match.thought.content}
                        </p>
                        <MemoryRecallExplanation match={match} topics={topics} />
                      </button>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        <button
                          className={`inline-flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-[11px] transition ${
                            feedback[match.thought.id] === "helpful"
                              ? "bg-sage/10 text-sage"
                              : "theme-card-overlay text-muted hover:text-ink"
                          }`}
                          type="button"
                          onClick={() => {
                            setFeedback((current) => ({
                              ...current,
                              [match.thought.id]: "helpful",
                            }));
                            persistFeedback(match.thought.id, "helpful");
                          }}
                        >
                          <Check size={12} strokeWidth={1.8} />
                          有帮助
                        </button>
                        <button
                          className={`inline-flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-[11px] transition ${
                            feedback[match.thought.id] === "irrelevant"
                              ? "bg-clay/10 text-clay"
                              : "theme-card-overlay text-muted hover:text-ink"
                          }`}
                          type="button"
                          onClick={() => {
                            setFeedback((current) => ({
                              ...current,
                              [match.thought.id]: "irrelevant",
                            }));
                            persistFeedback(match.thought.id, "irrelevant");
                          }}
                        >
                          <X size={12} strokeWidth={1.8} />
                          不相关
                        </button>
                        <button
                          className="theme-card-overlay inline-flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-[11px] text-muted transition hover:text-ink"
                          type="button"
                          onClick={() => {
                            setPinnedIds((current) => {
                              const alreadyPinned = current.includes(match.thought.id);
                              if (!alreadyPinned) {
                                persistFeedback(match.thought.id, "pinned");
                                return [match.thought.id, ...current];
                              }
                              return current.filter((id) => id !== match.thought.id);
                            });
                          }}
                        >
                          <Pin size={12} strokeWidth={1.8} />
                          固定
                        </button>
                        {onAttachToTopic && match.thought.topicIds[0] && (
                          <button
                            className="theme-card-overlay rounded-xl px-2.5 py-1.5 text-[11px] text-muted transition hover:text-ink"
                            type="button"
                            onClick={() => {
                              onAttachToTopic(match.thought.id, match.thought.topicIds[0]);
                              persistFeedback(match.thought.id, "same_topic");
                            }}
                          >
                            加入同一主题
                          </button>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            ))
          ) : (
            <div className="theme-card-soft rounded-[22px] p-3.5 text-sm leading-6 text-muted">
              暂时还没有足够接近的旧想法。继续写几句，或者多记录几天后，这里会更有用。
            </div>
          )}
        </div>
      </section>

      {relatedTopics.length > 0 && (
      <section className="frost-panel rounded-[28px] p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink">
          <Layers3 size={16} strokeWidth={1.8} />
          可以整理的主题
        </div>
        <div className="space-y-2">
          {relatedTopics.map((topic) => (
            <button
              key={topic.id}
              className="theme-card-soft w-full rounded-[22px] px-3 py-3 text-left transition"
              type="button"
              onClick={() => onOpenTopic(topic.id)}
            >
              <div className="mb-1 flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-ink">{topic.name}</span>
                <span className="theme-pill rounded-full px-2.5 py-1 text-xs text-muted">
                  {topic.thoughtIds.length} 条
                </span>
              </div>
              <p className="text-xs leading-5 text-muted">{topic.summary}</p>
            </button>
          ))}
        </div>
      </section>
      )}
    </aside>
  );
}

import { ArrowRight, Clock3 } from "lucide-react";
import { formatMonthDay } from "../lib/date";
import type {
  MemoryFeedbackType,
  MemoryMatch,
  MemoryMatchKind,
} from "../types";

interface MemoryMatchCardProps {
  match: MemoryMatch;
  onGenerateDraft?: (thoughtId: string) => void;
  onOpenThought?: (thoughtId: string) => void;
  onFeedback?: (thoughtId: string, feedback: MemoryFeedbackType) => void;
  selectedFeedback?: MemoryFeedbackType | null;
  showFeedback?: boolean;
  compact?: boolean;
}

const kindLabels: Record<MemoryMatchKind, string> = {
  direct: "直接相关",
  similar: "相似想法",
  counterpoint: "反向观点",
};

const feedbackOptions: Array<{
  label: string;
  value: MemoryFeedbackType;
}> = [
  { label: "有帮助", value: "helpful" },
  { label: "不相关", value: "irrelevant" },
  { label: "同一主题", value: "same_topic" },
];

export function MemoryMatchCard({
  match,
  onGenerateDraft,
  onOpenThought,
  onFeedback,
  selectedFeedback = null,
  showFeedback = false,
  compact = false,
}: MemoryMatchCardProps) {
  return (
    <article className="theme-card-soft rounded-[20px] p-3.5 text-left">
      <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-muted">
        <span className="theme-pill rounded-full px-2 py-0.5">
          {kindLabels[match.kind]}
        </span>
        <span className="inline-flex items-center gap-1">
          <Clock3 size={13} strokeWidth={1.8} />
          {formatMonthDay(match.thought.createdAt)}
        </span>
      </div>

      <div className="text-sm font-semibold leading-6 text-ink">
        {match.thought.summary}
      </div>
      <p
        className={`mt-1 text-sm leading-6 text-muted ${
          compact ? "line-clamp-2" : "line-clamp-4"
        }`}
      >
        {match.thought.content}
      </p>
      <div className="theme-card-overlay mt-3 rounded-[16px] px-3 py-2 text-xs leading-5 text-muted">
        {match.reason}
      </div>

      {(onOpenThought || onGenerateDraft || showFeedback) && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {onOpenThought && (
            <button
              className="theme-button-muted inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs transition"
              type="button"
              onClick={() => onOpenThought(match.thought.id)}
            >
              打开
              <ArrowRight size={13} strokeWidth={1.8} />
            </button>
          )}
          {onGenerateDraft && (
            <button
              className="theme-button-muted rounded-xl px-3 py-2 text-xs transition"
              type="button"
              onClick={() => onGenerateDraft(match.thought.id)}
            >
              生成草稿
            </button>
          )}
          {showFeedback &&
            feedbackOptions.map((option) => {
              const selected = selectedFeedback === option.value;
              return (
                <button
                  key={option.value}
                  className={`rounded-xl px-3 py-2 text-xs transition ${
                    selected
                      ? "theme-accent-soft font-medium text-ink"
                      : "theme-button-muted"
                  }`}
                  type="button"
                  onClick={() => onFeedback?.(match.thought.id, option.value)}
                >
                  {option.label}
                </button>
              );
            })}
        </div>
      )}
    </article>
  );
}

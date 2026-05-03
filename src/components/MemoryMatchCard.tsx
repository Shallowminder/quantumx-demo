import { ArrowRight, Clock3 } from "lucide-react";
import { formatMonthDay } from "../lib/date";
import type { MemoryMatch, MemoryMatchKind } from "../types";

interface MemoryMatchCardProps {
  match: MemoryMatch;
  onOpenThought?: (thoughtId: string) => void;
  compact?: boolean;
}

const kindLabels: Record<MemoryMatchKind, string> = {
  direct: "直接相关",
  similar: "相似想法",
  counterpoint: "反向观点",
};

export function MemoryMatchCard({
  match,
  onOpenThought,
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

      {onOpenThought && (
        <button
          className="theme-button-muted mt-3 inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs transition"
          type="button"
          onClick={() => onOpenThought(match.thought.id)}
        >
          打开
          <ArrowRight size={13} strokeWidth={1.8} />
        </button>
      )}
    </article>
  );
}

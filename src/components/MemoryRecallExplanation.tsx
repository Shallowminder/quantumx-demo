import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { buildRecallExplanation } from "../lib/visualization";
import type { MemoryMatch, Topic } from "../types";

export function MemoryRecallExplanation({
  match,
  topics,
}: {
  match: MemoryMatch;
  topics: Topic[];
}) {
  const [expanded, setExpanded] = useState(false);
  const explanation = buildRecallExplanation(match, topics);

  return (
    <div className="mt-2 rounded-md bg-white/70 px-2 py-1.5 text-xs leading-5 text-muted">
      <button
        className="flex w-full items-center justify-between gap-2 text-left"
        type="button"
        onClick={() => setExpanded((value) => !value)}
      >
        <span>{explanation.summary}</span>
        {expanded ? (
          <ChevronUp size={13} strokeWidth={1.8} />
        ) : (
          <ChevronDown size={13} strokeWidth={1.8} />
        )}
      </button>
      {expanded && (
        <div className="mt-2 border-t border-line pt-2">
          <div className="mb-2 flex flex-wrap gap-1.5">
            <span className="rounded-full border border-line bg-canvas px-2 py-0.5">
              关系：{explanation.kindLabel}
            </span>
            <span className="rounded-full border border-line bg-canvas px-2 py-0.5">
              时间：{explanation.timeLabel}
            </span>
            <span className="rounded-full border border-line bg-canvas px-2 py-0.5">
              主题：{explanation.topicName}
            </span>
          </div>
          {explanation.signals.length > 0 && (
            <div>线索：{explanation.signals.join(" / ")}</div>
          )}
          <div className="mt-1">{match.reason}</div>
        </div>
      )}
    </div>
  );
}

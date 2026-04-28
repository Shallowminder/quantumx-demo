import { useState } from "react";
import { FileText } from "lucide-react";
import { formatMonthDay } from "../lib/date";
import { buildSourceComposition } from "../lib/visualization";
import type { DistillOutputType, Thought, Topic } from "../types";

interface SourceCompositionProps {
  outputType: DistillOutputType;
  sourceThoughts: Thought[];
  topics: Topic[];
}

export function SourceComposition({
  outputType,
  sourceThoughts,
  topics,
}: SourceCompositionProps) {
  const [showSources, setShowSources] = useState(false);
  const composition = buildSourceComposition(sourceThoughts, topics, outputType);
  const maxCount = Math.max(1, ...composition.rows.map((row) => row.count));

  return (
    <section className="frost-panel rounded-[24px] p-4">
      <div className="mb-1 flex items-center gap-2 text-sm font-semibold text-ink">
        <FileText size={16} strokeWidth={1.8} />
        这份草稿从哪里来
      </div>
      <p className="mb-4 text-sm leading-6 text-muted">
        当前选择 {composition.total} 条来源记录，准备整理成「{outputType}」。
      </p>

      {composition.rows.length === 0 ? (
        <p className="theme-card-soft rounded-[20px] p-3 text-sm text-muted">
          先选择几条来源记录，系统会在这里显示它们来自哪些主题。
        </p>
      ) : (
        <div className="space-y-3">
          {composition.rows.map((row) => (
            <div key={row.topic.id}>
              <div className="mb-1 flex items-center justify-between text-xs text-muted">
                <span>{row.topic.name}</span>
                <span>{row.count} 条</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-mist/55">
                <div
                  className="h-full rounded-full bg-sage/70"
                  style={{ width: `${Math.max(18, (row.count / maxCount) * 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      <button
        className="theme-button-secondary mt-4 rounded-xl px-3.5 py-2.5 text-sm transition"
        type="button"
        onClick={() => setShowSources((value) => !value)}
      >
        {showSources ? "收起来源" : "查看来源"}
      </button>

      {showSources && (
        <div className="mt-3 space-y-2">
          {sourceThoughts.map((thought) => (
            <div key={thought.id} className="theme-card-soft rounded-[20px] p-3">
              <div className="mb-1 text-xs text-muted">
                {formatMonthDay(thought.createdAt)} · {thought.source}
              </div>
              <p className="line-clamp-3 text-sm leading-6 text-ink">{thought.content}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

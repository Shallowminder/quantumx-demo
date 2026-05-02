import { FileText } from "lucide-react";
import { formatMonthDay } from "../lib/date";
import type { SavedDistill, Topic } from "../types";

interface HomeDraftHighlightsProps {
  savedDistills: SavedDistill[];
  topics: Topic[];
  onOpenDistill: () => void;
}

export function HomeDraftHighlights({
  savedDistills,
  topics,
  onOpenDistill,
}: HomeDraftHighlightsProps) {
  const drafts = [...savedDistills]
    .sort(
      (a, b) =>
        new Date(b.updatedAt ?? b.createdAt).getTime() -
        new Date(a.updatedAt ?? a.createdAt).getTime(),
    )
    .slice(0, 4);

  return (
    <section>
      <div className="mb-4">
        <h2 className="text-xl font-semibold tracking-normal text-ink">已经形成的输出</h2>
        <p className="mt-1 text-sm text-muted">这些零散想法已经被整理成草稿。</p>
      </div>
      {drafts.length === 0 ? (
        <p className="theme-card-soft rounded-2xl p-5 text-sm leading-7 text-muted">
          当你把几条记录整理成提纲、复盘或观点卡片后，它们会出现在这里。
        </p>
      ) : (
        <div className="space-y-2">
          {drafts.map((draft) => {
            const topic = topics.find((candidate) => candidate.id === draft.topicId);
            return (
              <button
                key={draft.id}
                className="theme-card-overlay flex w-full items-start gap-3 rounded-2xl p-4 text-left shadow-[0_10px_28px_rgb(var(--shadow-rgb)_/_0.04)] transition hover:text-ink"
                type="button"
                onClick={onOpenDistill}
              >
                <div className="theme-icon-soft mt-0.5 flex h-8 w-8 items-center justify-center rounded-full">
                  <FileText size={16} strokeWidth={1.8} />
                </div>
                <div>
                  <div className="font-medium text-ink">{draft.title}</div>
                  <div className="mt-1 text-xs text-muted">
                    {draft.outputType} · 来源 {draft.sourceThoughtIds.length} 条 · {topic?.name ?? "未归入主题"} · {formatMonthDay(draft.updatedAt ?? draft.createdAt)}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}

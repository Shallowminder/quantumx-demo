import { useEffect, useRef } from "react";
import { ArrowUp, Link2, PenLine } from "lucide-react";
import { motion } from "framer-motion";
import type { Topic } from "../types";

interface CaptureComposerProps {
  draft: string;
  focusSignal: number;
  relatedCount: number;
  suggestedTopics: Topic[];
  onDraftChange: (value: string) => void;
  onCapture: (value: string) => void;
}

export function CaptureComposer({
  draft,
  focusSignal,
  relatedCount,
  suggestedTopics,
  onDraftChange,
  onCapture,
}: CaptureComposerProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const canSubmit = draft.trim().length > 0;

  useEffect(() => {
    if (focusSignal > 0) {
      textareaRef.current?.focus();
    }
  }, [focusSignal]);

  function submit() {
    if (!canSubmit) return;
    onCapture(draft);
    window.setTimeout(() => textareaRef.current?.focus(), 0);
  }

  return (
    <motion.section
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-line bg-white p-4 shadow-soft"
      initial={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
    >
      <div className="mb-3 flex items-center gap-2 text-sm font-medium text-ink">
        <PenLine size={17} strokeWidth={1.8} />
        快速记录
      </div>

      <textarea
        ref={textareaRef}
        className="min-h-28 w-full resize-none rounded-lg border border-transparent bg-canvas px-4 py-3 text-[15px] leading-7 text-ink outline-none transition placeholder:text-muted/70 focus:border-sage/40 focus:bg-white"
        placeholder="写下一句话、一个问题、一段摘录，或刚冒出来的想法..."
        value={draft}
        onChange={(event) => onDraftChange(event.target.value)}
        onKeyDown={(event) => {
          if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
            event.preventDefault();
            submit();
          }

          if (event.key === "Escape") {
            event.preventDefault();
            onDraftChange("");
          }
        }}
      />

      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
          <span className="inline-flex items-center gap-2">
            <Link2 size={15} strokeWidth={1.8} />
            {relatedCount > 0
              ? `已找到 ${relatedCount} 条相关旧记录`
              : "输入后会自动带出相关旧记录"}
          </span>
          {suggestedTopics.length > 0 && (
            <span className="flex flex-wrap items-center gap-1">
              <span>可能相关：</span>
              {suggestedTopics.map((topic) => (
                <span
                  key={topic.id}
                  className="rounded-full border border-line bg-white px-2 py-0.5 text-[11px] text-muted"
                >
                  {topic.name}
                </span>
              ))}
            </span>
          )}
        </div>
        <button
          className={`inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition ${
            canSubmit
              ? "bg-ink text-white hover:bg-black"
              : "bg-stone-200 text-muted"
          }`}
          disabled={!canSubmit}
          type="button"
          onClick={submit}
        >
          记录
          <ArrowUp size={16} strokeWidth={1.8} />
        </button>
      </div>
    </motion.section>
  );
}

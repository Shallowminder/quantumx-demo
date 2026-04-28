import { ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import { formatDayLabel } from "../lib/date";
import { statusLabel } from "../lib/visualization";
import type { Thought, Topic } from "../types";
import { TopicBadge } from "./TopicBadge";

interface ThoughtCardProps {
  thought: Thought;
  topics: Topic[];
  onOpen: (thoughtId: string) => void;
}

export function ThoughtCard({ thought, topics, onOpen }: ThoughtCardProps) {
  const thoughtTopics = topics.filter((topic) => thought.topicIds.includes(topic.id));

  return (
    <motion.article
      animate={{ opacity: 1, y: 0 }}
      className="frost-panel group rounded-[24px] p-4 transition hover:bg-[rgb(var(--surface-overlay-rgb)/0.88)]"
      initial={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
    >
      <button
        className="w-full text-left"
        type="button"
        onClick={() => onOpen(thought.id)}
      >
        <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-muted">
          <span>{formatDayLabel(thought.createdAt)}</span>
          <span className="h-1 w-1 rounded-full bg-muted/40" />
          <span>{thought.source}</span>
          <span className="theme-chip-soft rounded-full px-2.5 py-1 text-[11px]">
            {statusLabel(thought.status)}
          </span>
        </div>
        <p className="text-[15px] leading-7 text-ink">{thought.content}</p>
        <div className="mt-4 flex items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {thoughtTopics.map((topic) => (
              <TopicBadge key={topic.id} topic={topic} />
            ))}
          </div>
          <ChevronRight
            className="shrink-0 text-muted transition group-hover:translate-x-0.5 group-hover:text-ink"
            size={18}
            strokeWidth={1.8}
          />
        </div>
      </button>
    </motion.article>
  );
}

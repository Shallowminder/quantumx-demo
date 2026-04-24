import { ArrowRight, NotebookPen } from "lucide-react";
import { ContinueThinkingPanel } from "../components/ContinueThinkingPanel";
import { HomeDraftHighlights } from "../components/HomeDraftHighlights";
import { HomeTopicHighlights } from "../components/HomeTopicHighlights";
import { PersonalStats } from "../components/PersonalStats";
import { ThinkingCalendar } from "../components/ThinkingCalendar";
import { getPersonalHomeSummary } from "../lib/visualization";
import type { SavedDistill, Thought, Topic, ViewKey } from "../types";

interface PersonalHomeProps {
  savedDistills: SavedDistill[];
  thoughts: Thought[];
  topics: Topic[];
  onContinueFromThought: (thought: Thought) => void;
  onNavigate: (view: ViewKey) => void;
  onOpenTopic: (topicId: string) => void;
}

export function PersonalHome({
  savedDistills,
  thoughts,
  topics,
  onContinueFromThought,
  onNavigate,
  onOpenTopic,
}: PersonalHomeProps) {
  const summary = getPersonalHomeSummary(thoughts, topics, savedDistills);
  const hasData = thoughts.length > 0;
  const topTopicText =
    summary.topTopicNames.length > 0
      ? `最近反复出现的是「${summary.topTopicNames.join("」和「")}」。`
      : "再多记录几天后，这里会慢慢浮现你的长期主题。";

  return (
    <div className="mx-auto max-w-6xl">
      <section className="relative overflow-hidden rounded-[28px] bg-white/60 px-5 py-9 shadow-[0_22px_70px_rgba(45,43,37,0.06)] ring-1 ring-line/60 sm:px-8 sm:py-12">
        <div className="pointer-events-none absolute inset-x-10 top-0 h-28 rounded-full bg-sage/10 blur-3xl" />
        <div className="relative max-w-3xl">
          <div className="mb-5 inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-ink text-white">
            <NotebookPen size={18} strokeWidth={1.8} />
          </div>
          <h1 className="text-4xl font-semibold tracking-normal text-ink sm:text-5xl">
            我的思考
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-muted">
            把每天零散的一句话，慢慢变成长期的问题、主题和草稿。
          </p>
          {hasData ? (
            <p className="mt-5 max-w-3xl text-sm leading-7 text-muted">
              你已经留下了 {summary.thoughtCount} 条想法，其中 {summary.organizedCount} 条被整理进主题，{summary.draftCount} 份变成了草稿。{topTopicText}
            </p>
          ) : (
            <div className="mt-6 rounded-2xl bg-canvas/80 p-5">
              <p className="text-sm leading-7 text-muted">
                这里会慢慢变成你的思考主页。先从今天的一句话开始。
              </p>
              <button
                className="mt-4 inline-flex items-center gap-2 rounded-full bg-sage px-4 py-2 text-sm font-medium text-white transition hover:bg-sage/90"
                type="button"
                onClick={() => onNavigate("today")}
              >
                去记录第一条想法
                <ArrowRight size={15} strokeWidth={1.8} />
              </button>
            </div>
          )}
        </div>
        {hasData && (
          <div className="relative mt-10">
            <PersonalStats
              savedDistills={savedDistills}
              thoughts={thoughts}
              topics={topics}
            />
          </div>
        )}
      </section>

      <div className="mt-7">
        <ThinkingCalendar
          savedDistills={savedDistills}
          thoughts={thoughts}
          topics={topics}
        />
      </div>

      <div className="mt-9 grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-9">
          <HomeTopicHighlights
            thoughts={thoughts}
            topics={topics}
            onOpenTopic={onOpenTopic}
          />
          <HomeDraftHighlights
            savedDistills={savedDistills}
            topics={topics}
            onOpenDistill={() => onNavigate("distill")}
          />
        </div>
        <ContinueThinkingPanel
          thoughts={thoughts}
          topics={topics}
          onContinueFromThought={onContinueFromThought}
          onOpenToday={() => onNavigate("today")}
          onOpenTopic={onOpenTopic}
        />
      </div>
    </div>
  );
}

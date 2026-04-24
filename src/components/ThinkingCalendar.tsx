import { useMemo, useState } from "react";
import { CalendarDays } from "lucide-react";
import { buildThinkingCalendarDays } from "../lib/visualization";
import type { CalendarDaySummary, SavedDistill, Thought, Topic } from "../types";

interface ThinkingCalendarProps {
  savedDistills: SavedDistill[];
  thoughts: Thought[];
  topics: Topic[];
}

function intensityClass(day: CalendarDaySummary, selected: boolean) {
  const total = day.thoughtCount + day.draftCount;
  if (selected) return "border-sage bg-sage/70";
  if (total === 0) return "border-transparent bg-stone-200/45 hover:bg-stone-200";
  if (total <= 2) return "border-transparent bg-sage/20 hover:bg-sage/30";
  if (total <= 4) return "border-transparent bg-sage/40 hover:bg-sage/50";
  return "border-transparent bg-sage/65 hover:bg-sage/75";
}

export function ThinkingCalendar({
  savedDistills,
  thoughts,
  topics,
}: ThinkingCalendarProps) {
  const days = useMemo(
    () => buildThinkingCalendarDays(thoughts, topics, savedDistills),
    [thoughts, topics, savedDistills],
  );
  const [selectedDate, setSelectedDate] = useState(() => {
    const latestWithData = [...days]
      .reverse()
      .find((day) => day.thoughtCount > 0 || day.draftCount > 0);
    return latestWithData?.date ?? days[days.length - 1]?.date;
  });
  const selectedDay =
    days.find((day) => day.date === selectedDate) ?? days[days.length - 1];
  const monthLabels = days.filter((day) => day.dayOfMonth === 1);

  return (
    <section className="rounded-[18px] bg-white/72 p-5 shadow-[0_14px_40px_rgba(45,43,37,0.06)] ring-1 ring-line/70 sm:p-6">
      <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm text-muted">
            <CalendarDays size={16} strokeWidth={1.8} />
            最近一年
          </div>
          <h2 className="text-xl font-semibold tracking-normal text-ink">思考日历</h2>
          <p className="mt-2 text-sm leading-6 text-muted">
            看看这些想法是在什么时候慢慢留下的。
          </p>
        </div>
        <div className="rounded-full bg-canvas px-3 py-1.5 text-xs text-muted">
          以后也可以按周查看更长时间里的思考痕迹
        </div>
      </div>

      <div className="overflow-x-auto pb-2 subtle-scrollbar">
        <div className="min-w-[760px]">
          <div className="relative mb-2 h-5">
            {monthLabels.map((day) => {
              const index = days.findIndex((item) => item.date === day.date);
              return (
                <span
                  key={day.date}
                  className="absolute text-[11px] text-muted"
                  style={{ left: `${(index / Math.max(1, days.length - 1)) * 100}%` }}
                >
                  {day.monthLabel}
                </span>
              );
            })}
          </div>
          <div className="grid grid-flow-col grid-rows-7 gap-1">
            {days.map((day) => {
              const selected = day.date === selectedDay?.date;
              return (
                <button
                  key={day.date}
                  aria-label={`${day.dateLabel}，${day.thoughtCount} 条记录`}
                  className={`h-3.5 w-3.5 rounded-[4px] border transition hover:scale-110 ${intensityClass(day, selected)}`}
                  title={`${day.dateLabel}：${day.thoughtCount} 条记录，${day.draftCount} 份草稿`}
                  type="button"
                  onClick={() => setSelectedDate(day.date)}
                />
              );
            })}
          </div>
        </div>
      </div>

      <div className="mt-5 rounded-2xl bg-canvas/80 p-4">
        <div className="mb-2 text-sm font-semibold text-ink">
          {selectedDay?.dateLabel ?? "这一天"}
        </div>
        {selectedDay && selectedDay.thoughtCount + selectedDay.draftCount > 0 ? (
          <div className="space-y-3">
            <div className="grid gap-2 text-sm text-muted sm:grid-cols-3">
              <div>记录 {selectedDay.thoughtCount} 条想法</div>
              <div>整理进主题 {selectedDay.organizedCount} 条</div>
              <div>生成草稿 {selectedDay.draftCount} 份</div>
            </div>
            {selectedDay.topicNames.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {selectedDay.topicNames.map((name) => (
                  <span
                    key={name}
                    className="rounded-full bg-white px-2.5 py-1 text-xs text-muted ring-1 ring-line/70"
                  >
                    {name}
                  </span>
                ))}
              </div>
            )}
            {selectedDay.representativeThought && (
              <p className="text-sm leading-7 text-ink">
                “{selectedDay.representativeThought}”
              </p>
            )}
          </div>
        ) : (
          <p className="text-sm leading-7 text-muted">
            这一天没有留下记录。有些日子留下很多，有些日子只是经过。都没关系。
          </p>
        )}
      </div>
    </section>
  );
}

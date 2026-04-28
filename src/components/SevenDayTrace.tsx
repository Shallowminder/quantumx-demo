import { buildSevenDayTrace } from "../lib/visualization";
import type { SavedDistill, Thought } from "../types";

interface SevenDayTraceProps {
  savedDistills?: SavedDistill[];
  thoughts: Thought[];
}

export function SevenDayTrace({
  savedDistills = [],
  thoughts,
}: SevenDayTraceProps) {
  const days = buildSevenDayTrace(thoughts, savedDistills);
  const activeDays = days.filter((day) => day.count > 0).length;
  const total = days.reduce((sum, day) => sum + day.count, 0);

  return (
    <section className="frost-panel rounded-[24px] p-5">
      <div className="mb-2 text-sm font-semibold text-ink">
        最近 7 天的思考痕迹
      </div>
      <p className="mb-4 text-sm leading-6 text-muted">
        最近 7 天有 {activeDays} 天留下了记录，共 {total} 条想法。
      </p>
      <div className="grid grid-cols-7 gap-2">
        {days.map((day) => {
          const level =
            day.count === 0 ? "empty" : day.count <= 2 ? "light" : "strong";
          return (
            <div key={day.key} className="text-center" title={`${day.dateLabel}：${day.count} 条记录，${day.recalledCount} 条带回旧想法，${day.themedCount} 条进主题，${day.distillCount} 份草稿`}>
              <div className="mb-2 text-xs text-muted">{day.label}</div>
              <div
                className={`mx-auto h-4 w-4 rounded-full border ${
                  level === "empty"
                    ? "border-line bg-mist/45"
                    : level === "light"
                      ? "border-sage/30 bg-sage/25"
                      : "border-sage/50 bg-sage"
                }`}
              />
              <div className="mt-2 text-[11px] text-muted">{day.count} 条</div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

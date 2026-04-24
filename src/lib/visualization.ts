import type {
  DistillOutputType,
  MemoryMatch,
  SavedDistill,
  CalendarDaySummary,
  Thought,
  ThoughtStatus,
  Topic,
} from "../types";

const DAY_MS = 1000 * 60 * 60 * 24;

export function safeDate(value?: string): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function daysBetween(dateValue: string, base = new Date()): number {
  const date = safeDate(dateValue);
  if (!date) return 9999;
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const baseStart = new Date(base.getFullYear(), base.getMonth(), base.getDate());
  return Math.max(0, Math.floor((baseStart.getTime() - start.getTime()) / DAY_MS));
}

export function relativeDayLabel(value: string): string {
  const days = daysBetween(value);
  if (days === 0) return "今天";
  if (days === 1) return "昨天";
  if (days <= 7) return `${days} 天前`;
  if (days <= 30) return `${Math.ceil(days / 7)} 周前`;
  return "较早";
}

export function getTopicThoughts(topic: Topic, thoughts: Thought[]): Thought[] {
  return thoughts.filter(
    (thought) =>
      topic.thoughtIds.includes(thought.id) || thought.topicIds.includes(topic.id),
  );
}

export function getStatusIndex(thought: Thought): number {
  if (thought.status === "archived") return 4;
  if (thought.status === "distilled") return 3;
  if (thought.status === "themed" || thought.topicIds.length > 0) return 2;
  if (thought.status === "linked" || thought.relatedIds.length > 0) return 1;
  return 0;
}

export function statusLabel(status: ThoughtStatus): string {
  const labels: Record<ThoughtStatus, string> = {
    inbox: "刚记录",
    linked: "已关联",
    themed: "已整理",
    distilled: "已用于蒸馏",
    archived: "已归档",
  };
  return labels[status];
}

export function buildTopicTimeline(
  topic: Topic,
  thoughts: Thought[],
  savedDistills: SavedDistill[] = [],
) {
  const topicThoughts = getTopicThoughts(topic, thoughts).sort(
    (a, b) =>
      (safeDate(a.createdAt)?.getTime() ?? 0) -
      (safeDate(b.createdAt)?.getTime() ?? 0),
  );
  const topicDistills = savedDistills.filter((draft) => draft.topicId === topic.id);
  if (topicThoughts.length === 0) return [];

  const first = topicThoughts[0];
  const latest = topicThoughts[topicThoughts.length - 1];
  const inboxCount = topicThoughts.filter((thought) => thought.status === "inbox").length;
  const recentCount = topicThoughts.filter((thought) => daysBetween(thought.createdAt) <= 7).length;

  const items = [
    {
      id: "first",
      date: first.createdAt,
      title: "第一次出现",
      body: `这个主题第一次出现在「${first.summary}」。`,
    },
  ];

  if (topicThoughts.length >= 3) {
    items.push({
      id: "repeat",
      date: topicThoughts[Math.min(2, topicThoughts.length - 1)].createdAt,
      title: "开始反复出现",
      body: `已经积累 ${topicThoughts.length} 条记录，说明它不只是一次性的想法。`,
    });
  }

  if (inboxCount > 0) {
    items.push({
      id: "inbox",
      date: latest.createdAt,
      title: "形成待整理材料",
      body: `还有 ${inboxCount} 条想法没安顿好，适合顺手放进这个主题。`,
    });
  }

  if (topicDistills.length > 0 || topicThoughts.some((thought) => thought.status === "distilled")) {
    items.push({
      id: "distilled",
      date: topicDistills[0]?.updatedAt ?? topicDistills[0]?.createdAt ?? latest.createdAt,
      title: "已经可以蒸馏",
      body: `这个主题已有草稿或被用于蒸馏，可以继续整理成提纲、复盘或观点卡片。`,
    });
  } else if (topicThoughts.length >= 4) {
    items.push({
      id: "ready",
      date: latest.createdAt,
      title: "已经可以整理",
      body: `现在已经积累 ${topicThoughts.length} 条记录，可以整理成一份观点卡片。`,
    });
  }

  if (recentCount > 0) {
    items.push({
      id: "recent",
      date: latest.createdAt,
      title: "最近又被更新",
      body: `最近 7 天又新增或带回 ${recentCount} 条相关记录。`,
    });
  }

  return items.slice(0, 5);
}

export function buildRecallExplanation(match: MemoryMatch, topics: Topic[]) {
  const topic = topics.find((candidate) => match.thought.topicIds.includes(candidate.id));
  const kindLabels = {
    direct: "直接相关",
    similar: "相似问题",
    counterpoint: "不同角度",
  } as const;

  const signals = [
    ...(topic?.signals.slice(0, 2) ?? []),
    match.reason.includes("判断") ? "判断" : "",
    match.reason.includes("写作") ? "写作" : "",
  ].filter(Boolean);

  return {
    kindLabel: kindLabels[match.kind],
    timeLabel: relativeDayLabel(match.thought.createdAt),
    topicName: topic?.name ?? "未归入主题",
    signals: Array.from(new Set(signals)).slice(0, 3),
    summary: `${kindLabels[match.kind]} · ${relativeDayLabel(match.thought.createdAt)} · ${topic ? `同属「${topic.name}」` : "主题还不明确"}`,
  };
}

export function buildSourceComposition(
  sourceThoughts: Thought[],
  topics: Topic[],
  outputType: DistillOutputType,
) {
  const byTopic = new Map<string, { topic: Topic; count: number }>();
  sourceThoughts.forEach((thought) => {
    const topic = topics.find((candidate) => thought.topicIds.includes(candidate.id));
    if (!topic) return;
    const current = byTopic.get(topic.id);
    byTopic.set(topic.id, { topic, count: (current?.count ?? 0) + 1 });
  });

  return {
    total: sourceThoughts.length,
    outputType,
    rows: Array.from(byTopic.values()).sort((a, b) => b.count - a.count),
  };
}

export function buildSevenDayTrace(
  thoughts: Thought[],
  savedDistills: SavedDistill[] = [],
) {
  const today = new Date();
  return Array.from({ length: 7 }).map((_, index) => {
    const offset = 6 - index;
    const date = new Date(today);
    date.setDate(today.getDate() - offset);
    const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const end = new Date(start);
    end.setDate(start.getDate() + 1);
    const dayThoughts = thoughts.filter((thought) => {
      const created = safeDate(thought.createdAt);
      if (!created) return false;
      return created >= start && created < end;
    });
    const dayDistills = savedDistills.filter((draft) => {
      const created = safeDate(draft.updatedAt ?? draft.createdAt);
      if (!created) return false;
      return created >= start && created < end;
    });

    return {
      key: start.toISOString(),
      label: start.toLocaleDateString("zh-CN", { weekday: "short" }),
      dateLabel: start.toLocaleDateString("zh-CN", { month: "long", day: "numeric" }),
      count: dayThoughts.length,
      recalledCount: dayThoughts.filter((thought) => thought.relatedIds.length > 0).length,
      themedCount: dayThoughts.filter((thought) => thought.topicIds.length > 0).length,
      distillCount: dayDistills.length,
    };
  });
}

export function buildThinkingCalendarDays(
  thoughts: Thought[],
  topics: Topic[],
  savedDistills: SavedDistill[] = [],
): CalendarDaySummary[] {
  const today = new Date();
  const start = new Date(today);
  start.setDate(today.getDate() - 364);
  const dayMap = new Map<string, CalendarDaySummary>();

  Array.from({ length: 365 }).forEach((_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    const key = date.toISOString().slice(0, 10);
    dayMap.set(key, {
      date: key,
      dateLabel: date.toLocaleDateString("zh-CN", {
        month: "long",
        day: "numeric",
      }),
      monthLabel: date.toLocaleDateString("zh-CN", { month: "short" }),
      dayOfMonth: date.getDate(),
      thoughtCount: 0,
      organizedCount: 0,
      draftCount: 0,
      topicNames: [],
    });
  });

  thoughts.forEach((thought) => {
    const date = safeDate(thought.createdAt);
    if (!date) return;
    const key = date.toISOString().slice(0, 10);
    const day = dayMap.get(key);
    if (!day) return;
    day.thoughtCount += 1;
    if (thought.status !== "inbox" || thought.topicIds.length > 0) {
      day.organizedCount += 1;
    }
    if (!day.representativeThought) {
      day.representativeThought = thought.content;
    }
    const names = thought.topicIds
      .map((topicId) => topics.find((topic) => topic.id === topicId)?.name)
      .filter((name): name is string => Boolean(name));
    day.topicNames = Array.from(new Set([...day.topicNames, ...names])).slice(0, 4);
  });

  savedDistills.forEach((draft) => {
    const date = safeDate(draft.updatedAt ?? draft.createdAt);
    if (!date) return;
    const key = date.toISOString().slice(0, 10);
    const day = dayMap.get(key);
    if (!day) return;
    day.draftCount += 1;
    const topicName = topics.find((topic) => topic.id === draft.topicId)?.name;
    if (topicName) {
      day.topicNames = Array.from(new Set([...day.topicNames, topicName])).slice(0, 4);
    }
  });

  return Array.from(dayMap.values());
}

export function getTopTopics(topics: Topic[], thoughts: Thought[], limit = 5) {
  return topics
    .map((topic) => {
      const topicThoughts = getTopicThoughts(topic, thoughts);
      const latest = topicThoughts
        .map((thought) => safeDate(thought.createdAt)?.getTime() ?? 0)
        .sort((a, b) => b - a)[0];
      return {
        topic,
        count: topicThoughts.length,
        latest: latest ?? 0,
        questions: Array.from(new Set(topicThoughts.flatMap((thought) => thought.questions))),
      };
    })
    .filter((item) => item.count > 0)
    .sort((a, b) => b.count - a.count || b.latest - a.latest)
    .slice(0, limit);
}

export function getPersonalHomeSummary(
  thoughts: Thought[],
  topics: Topic[],
  savedDistills: SavedDistill[],
) {
  const organizedCount = thoughts.filter(
    (thought) => thought.topicIds.length > 0 || thought.status !== "inbox",
  ).length;
  const activeDays = new Set(
    thoughts
      .map((thought) => safeDate(thought.createdAt)?.toISOString().slice(0, 10))
      .filter(Boolean),
  ).size;
  const topTopicNames = getTopTopics(topics, thoughts, 2).map((item) => item.topic.name);

  return {
    thoughtCount: thoughts.length,
    topicCount: topics.length,
    draftCount: savedDistills.length,
    organizedCount,
    activeDays,
    topTopicNames,
  };
}

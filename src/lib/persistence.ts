import type {
  QuantumXDataExport,
  QuantumXDataSnapshot,
  SavedDistill,
  Thought,
  Topic,
} from "../types";

export const THOUGHTS_STORAGE_KEY = "quantumx.thoughts";
export const TOPICS_STORAGE_KEY = "quantumx.topics";
export const CAPTURE_DRAFT_STORAGE_KEY = "quantumx.captureDraft";
export const DISTILLS_STORAGE_KEY = "quantumx.distills";

export function readStoredValue<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;

  try {
    const stored = window.localStorage.getItem(key);
    return stored ? (JSON.parse(stored) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function writeStoredValue<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

export function normalizeThoughts(storedThoughts: Thought[]): Thought[] {
  if (!Array.isArray(storedThoughts)) return [];

  return storedThoughts
    .filter((thought) => thought && typeof thought.id === "string")
    .map((thought) => {
      const legacyStatus = thought.status as string;
      const status =
        legacyStatus === "captured"
          ? "inbox"
          : legacyStatus === "reviewed"
            ? "themed"
            : legacyStatus === "drafted"
              ? "distilled"
              : thought.status;

      return {
        ...thought,
        content: thought.content ?? "",
        createdAt: thought.createdAt ?? new Date().toISOString(),
        source: thought.source ?? "导入记录",
        summary: thought.summary ?? thought.content ?? "未命名想法",
        topicIds: Array.isArray(thought.topicIds) ? thought.topicIds : [],
        relatedIds: Array.isArray(thought.relatedIds) ? thought.relatedIds : [],
        questions: Array.isArray(thought.questions) ? thought.questions : [],
        status: status ?? "inbox",
      };
    });
}

export function normalizeTopics(storedTopics: Topic[]): Topic[] {
  if (!Array.isArray(storedTopics)) return [];

  return storedTopics
    .filter((topic) => topic && typeof topic.id === "string")
    .map((topic) => ({
      ...topic,
      name: topic.name ?? "未命名主题",
      summary: topic.summary ?? "这个主题还在形成。",
      description: topic.description ?? "先继续收集相关记录。",
      updatedAt: topic.updatedAt ?? new Date().toISOString(),
      accent: topic.accent ?? "stone",
      thoughtIds: Array.isArray(topic.thoughtIds) ? topic.thoughtIds : [],
      signals: Array.isArray(topic.signals) ? topic.signals : [],
      distill: topic.distill ?? {
        title: `${topic.name ?? "未命名主题"} 的整理草稿`,
        format: "文章提纲",
        basedOn: "基于导入记录生成",
        outline: [],
        cards: [],
      },
    }));
}

export function normalizeDistills(storedDistills: SavedDistill[]): SavedDistill[] {
  if (!Array.isArray(storedDistills)) return [];

  return storedDistills
    .filter((draft) => draft && typeof draft.id === "string")
    .map((draft) => ({
      ...draft,
      topicId: draft.topicId ?? "",
      title: draft.title ?? "未命名草稿",
      outputType: draft.outputType ?? "文章提纲",
      content: draft.content ?? "",
      sourceThoughtIds: Array.isArray(draft.sourceThoughtIds)
        ? draft.sourceThoughtIds
        : [],
      createdAt: draft.createdAt ?? new Date().toISOString(),
      updatedAt: draft.updatedAt ?? draft.createdAt ?? new Date().toISOString(),
    }));
}

export function createDataExport(
  snapshot: QuantumXDataSnapshot,
): QuantumXDataExport {
  return {
    app: "QuantumX",
    version: 1,
    exportedAt: new Date().toISOString(),
    note: "QuantumX 本地数据备份。导入会覆盖当前浏览器里的本地记录。",
    data: snapshot,
  };
}

export function parseDataExport(raw: string): QuantumXDataSnapshot {
  const parsed = JSON.parse(raw) as Partial<QuantumXDataExport> & {
    data?: Partial<QuantumXDataSnapshot>;
  };
  const data: Partial<QuantumXDataSnapshot> = parsed.data ?? {};

  return {
    thoughts: normalizeThoughts((data.thoughts ?? []) as Thought[]),
    topics: normalizeTopics((data.topics ?? []) as Topic[]),
    savedDistills: normalizeDistills(
      (data.savedDistills ?? []) as SavedDistill[],
    ),
    captureDraft:
      typeof data.captureDraft === "string" ? data.captureDraft : "",
  };
}

export function getStorageSizeLabel(snapshot: QuantumXDataSnapshot): string {
  const bytes = new Blob([JSON.stringify(snapshot)]).size;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

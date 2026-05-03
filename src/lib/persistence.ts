import type {
  CloudSyncMetadata,
  DistillOutputType,
  QuantumXDataExport,
  QuantumXDataSnapshot,
  SavedDistill,
  SnapshotSummary,
  Thought,
  ThoughtStatus,
  Topic,
} from "../types";

export const THOUGHTS_STORAGE_KEY = "quantumx.thoughts";
export const TOPICS_STORAGE_KEY = "quantumx.topics";
export const CAPTURE_DRAFT_STORAGE_KEY = "quantumx.captureDraft";
export const DISTILLS_STORAGE_KEY = "quantumx.distills";
export const CLOUD_SYNC_METADATA_STORAGE_KEY = "quantumx.cloudSyncMetadata";
export const ANONYMOUS_STORAGE_SCOPE = "anonymous";

function buildScopedKey(baseKey: string, scope: string) {
  return `${baseKey}.${encodeURIComponent(scope)}`;
}

function hasStoredKey(key: string) {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(key) !== null;
  } catch {
    return false;
  }
}

export function getStorageScope(userId?: string | null) {
  return userId ? `user:${userId}` : ANONYMOUS_STORAGE_SCOPE;
}

export function getScopedStorageKeys(scope: string) {
  return {
    thoughts: buildScopedKey(THOUGHTS_STORAGE_KEY, scope),
    topics: buildScopedKey(TOPICS_STORAGE_KEY, scope),
    captureDraft: buildScopedKey(CAPTURE_DRAFT_STORAGE_KEY, scope),
    distills: buildScopedKey(DISTILLS_STORAGE_KEY, scope),
    cloudSyncMetadata: buildScopedKey(CLOUD_SYNC_METADATA_STORAGE_KEY, scope),
  };
}

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

export function readScopedSnapshot(
  scope: string,
  fallback: QuantumXDataSnapshot,
): QuantumXDataSnapshot {
  const keys = getScopedStorageKeys(scope);
  const allowLegacyFallback = scope === ANONYMOUS_STORAGE_SCOPE;

  const thoughtsFallback =
    allowLegacyFallback && !hasStoredKey(keys.thoughts)
      ? readStoredValue(THOUGHTS_STORAGE_KEY, fallback.thoughts)
      : fallback.thoughts;
  const topicsFallback =
    allowLegacyFallback && !hasStoredKey(keys.topics)
      ? readStoredValue(TOPICS_STORAGE_KEY, fallback.topics)
      : fallback.topics;
  const distillsFallback =
    allowLegacyFallback && !hasStoredKey(keys.distills)
      ? readStoredValue(DISTILLS_STORAGE_KEY, fallback.savedDistills)
      : fallback.savedDistills;
  const captureDraftFallback =
    allowLegacyFallback && !hasStoredKey(keys.captureDraft)
      ? readStoredValue(CAPTURE_DRAFT_STORAGE_KEY, fallback.captureDraft)
      : fallback.captureDraft;

  return normalizeSnapshot({
    thoughts: normalizeThoughts(readStoredValue(keys.thoughts, thoughtsFallback)),
    topics: normalizeTopics(readStoredValue(keys.topics, topicsFallback)),
    savedDistills: normalizeDistills(
      readStoredValue(keys.distills, distillsFallback),
    ),
    captureDraft: readStoredValue(keys.captureDraft, captureDraftFallback),
  });
}

export function writeScopedSnapshot(
  scope: string,
  snapshot: QuantumXDataSnapshot,
) {
  const keys = getScopedStorageKeys(scope);
  const normalizedSnapshot = normalizeSnapshot(snapshot);
  writeStoredValue(keys.thoughts, normalizedSnapshot.thoughts);
  writeStoredValue(keys.topics, normalizedSnapshot.topics);
  writeStoredValue(keys.distills, normalizedSnapshot.savedDistills);
  writeStoredValue(keys.captureDraft, normalizedSnapshot.captureDraft);
}

function normalizeThoughtStatus(status: unknown): ThoughtStatus {
  if (
    status === "inbox" ||
    status === "linked" ||
    status === "themed" ||
    status === "distilled" ||
    status === "archived"
  ) {
    return status;
  }

  if (status === "captured") return "inbox";
  if (status === "reviewed") return "themed";
  if (status === "drafted") return "distilled";

  return "inbox";
}

function normalizeTopicAccent(accent: unknown): Topic["accent"] {
  if (
    accent === "sage" ||
    accent === "clay" ||
    accent === "blue" ||
    accent === "amber" ||
    accent === "stone"
  ) {
    return accent;
  }

  return "stone";
}

function normalizeDistillOutputType(outputType: unknown): DistillOutputType {
  if (
    outputType === "文章提纲" ||
    outputType === "复盘框架" ||
    outputType === "观点卡片"
  ) {
    return outputType;
  }

  return "文章提纲";
}

function normalizeIsoDate(
  value: unknown,
  fallback = new Date().toISOString(),
): string {
  if (typeof value !== "string") return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return date.toISOString();
}

function normalizeOptionalIsoDate(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString();
}

function normalizeCount(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? Math.floor(value)
    : 0;
}

function normalizeSnapshotSummary(summary: unknown): SnapshotSummary | undefined {
  if (!summary || typeof summary !== "object") return undefined;
  const candidate = summary as Partial<SnapshotSummary>;

  return {
    thoughts: normalizeCount(candidate.thoughts),
    topics: normalizeCount(candidate.topics),
    drafts: normalizeCount(candidate.drafts),
    hasCaptureDraft: candidate.hasCaptureDraft === true,
    latestActivityAt: normalizeOptionalIsoDate(candidate.latestActivityAt),
  };
}

export function normalizeThoughts(storedThoughts: Thought[]): Thought[] {
  if (!Array.isArray(storedThoughts)) return [];

  return storedThoughts
    .filter((thought) => thought && typeof thought.id === "string")
    .map((thought) => {
      const createdAt = normalizeIsoDate(thought.createdAt);

      return {
        ...thought,
        content: thought.content ?? "",
        createdAt,
        source: thought.source ?? "导入记录",
        summary: thought.summary ?? thought.content ?? "未命名想法",
        topicIds: Array.isArray(thought.topicIds) ? thought.topicIds : [],
        relatedIds: Array.isArray(thought.relatedIds) ? thought.relatedIds : [],
        questions: Array.isArray(thought.questions) ? thought.questions : [],
        status: normalizeThoughtStatus(thought.status),
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
      updatedAt: normalizeIsoDate(topic.updatedAt),
      accent: normalizeTopicAccent(topic.accent),
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
    .map((draft) => {
      const createdAt = normalizeIsoDate(draft.createdAt);
      const updatedAt = normalizeIsoDate(draft.updatedAt, createdAt);

      return {
        ...draft,
        topicId: draft.topicId ?? "",
        title: draft.title ?? "未命名草稿",
        outputType: normalizeDistillOutputType(draft.outputType),
        content: draft.content ?? "",
        sourceThoughtIds: Array.isArray(draft.sourceThoughtIds)
          ? draft.sourceThoughtIds
          : [],
        createdAt,
        updatedAt,
      };
    });
}

export function normalizeSnapshot(
  snapshot: Partial<QuantumXDataSnapshot>,
): QuantumXDataSnapshot {
  const normalizedThoughts = normalizeThoughts(
    (snapshot.thoughts ?? []) as Thought[],
  );
  const normalizedTopics = normalizeTopics((snapshot.topics ?? []) as Topic[]);
  const normalizedDistills = normalizeDistills(
    (snapshot.savedDistills ?? []) as SavedDistill[],
  );
  const validThoughtIds = new Set(normalizedThoughts.map((thought) => thought.id));
  const validTopicIds = new Set(normalizedTopics.map((topic) => topic.id));
  const topicToThoughtIds = new Map<string, Set<string>>();
  const thoughtToTopicIds = new Map<string, Set<string>>();

  for (const thought of normalizedThoughts) {
    const thoughtTopics = new Set<string>();
    for (const topicId of thought.topicIds) {
      if (!validTopicIds.has(topicId)) continue;
      thoughtTopics.add(topicId);
      if (!topicToThoughtIds.has(topicId)) {
        topicToThoughtIds.set(topicId, new Set());
      }
      topicToThoughtIds.get(topicId)?.add(thought.id);
    }
    thoughtToTopicIds.set(thought.id, thoughtTopics);
  }

  for (const topic of normalizedTopics) {
    const topicThoughts = topicToThoughtIds.get(topic.id) ?? new Set<string>();
    for (const thoughtId of topic.thoughtIds) {
      if (!validThoughtIds.has(thoughtId)) continue;
      topicThoughts.add(thoughtId);
      if (!thoughtToTopicIds.has(thoughtId)) {
        thoughtToTopicIds.set(thoughtId, new Set());
      }
      thoughtToTopicIds.get(thoughtId)?.add(topic.id);
    }
    topicToThoughtIds.set(topic.id, topicThoughts);
  }

  return {
    thoughts: normalizedThoughts.map((thought) => ({
      ...thought,
      topicIds: Array.from(thoughtToTopicIds.get(thought.id) ?? []),
      relatedIds: thought.relatedIds.filter((id) => validThoughtIds.has(id)),
    })),
    topics: normalizedTopics.map((topic) => ({
      ...topic,
      thoughtIds: Array.from(topicToThoughtIds.get(topic.id) ?? []),
    })),
    savedDistills: normalizedDistills.map((draft) => ({
      ...draft,
      topicId: validTopicIds.has(draft.topicId) ? draft.topicId : "",
      sourceThoughtIds: draft.sourceThoughtIds.filter((id) =>
        validThoughtIds.has(id),
      ),
    })),
    captureDraft:
      typeof snapshot.captureDraft === "string" ? snapshot.captureDraft : "",
  };
}

export function createDataExport(
  snapshot: QuantumXDataSnapshot,
): QuantumXDataExport {
  const normalizedSnapshot = normalizeSnapshot(snapshot);

  return {
    app: "QuantumX",
    version: 1,
    exportedAt: new Date().toISOString(),
    note: "QuantumX 本地数据备份。导入会覆盖当前浏览器里的本地记录。",
    data: normalizedSnapshot,
  };
}

export function parseDataExport(raw: string): QuantumXDataSnapshot {
  const parsed = JSON.parse(raw) as Partial<QuantumXDataExport> & {
    data?: Partial<QuantumXDataSnapshot>;
  };
  const data: Partial<QuantumXDataSnapshot> = parsed.data ?? {};

  return normalizeSnapshot(data);
}

export function getStorageSizeLabel(snapshot: QuantumXDataSnapshot): string {
  const bytes = new Blob([JSON.stringify(snapshot)]).size;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function normalizeCloudSyncMetadata(
  metadata: Partial<CloudSyncMetadata> | null | undefined,
): CloudSyncMetadata {
  if (!metadata || typeof metadata !== "object") return {};

  return {
    lastLocalSavedAt: normalizeOptionalIsoDate(metadata.lastLocalSavedAt),
    lastPushedAt: normalizeOptionalIsoDate(metadata.lastPushedAt),
    lastPulledAt: normalizeOptionalIsoDate(metadata.lastPulledAt),
    lastKnownCloudSummary: normalizeSnapshotSummary(metadata.lastKnownCloudSummary),
  };
}

export function readScopedCloudSyncMetadata(scope: string): CloudSyncMetadata {
  const keys = getScopedStorageKeys(scope);
  const allowLegacyFallback = scope === ANONYMOUS_STORAGE_SCOPE;
  const fallback =
    allowLegacyFallback && !hasStoredKey(keys.cloudSyncMetadata)
      ? readStoredValue(CLOUD_SYNC_METADATA_STORAGE_KEY, {})
      : {};

  return normalizeCloudSyncMetadata(
    readStoredValue(keys.cloudSyncMetadata, fallback),
  );
}

export function writeScopedCloudSyncMetadata(
  scope: string,
  metadata: CloudSyncMetadata,
) {
  const keys = getScopedStorageKeys(scope);
  writeStoredValue(keys.cloudSyncMetadata, metadata);
}

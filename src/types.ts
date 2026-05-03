export type ViewKey =
  | "today"
  | "home"
  | "search"
  | "topics"
  | "distill"
  | "insights"
  | "data"
  | "detail";

export type ThoughtStatus = "inbox" | "linked" | "themed" | "distilled" | "archived";

export type MemoryMatchKind = "direct" | "similar" | "counterpoint";
export type MemoryFeedbackType =
  | "helpful"
  | "irrelevant"
  | "pinned"
  | "same_topic";

export interface Thought {
  id: string;
  content: string;
  createdAt: string;
  source: string;
  summary: string;
  topicIds: string[];
  relatedIds: string[];
  questions: string[];
  status: ThoughtStatus;
}

export interface MemoryMatch {
  thought: Thought;
  kind: MemoryMatchKind;
  reason: string;
  score: number;
}

export interface Topic {
  id: string;
  name: string;
  summary: string;
  description: string;
  updatedAt: string;
  accent: "sage" | "clay" | "blue" | "amber" | "stone";
  thoughtIds: string[];
  signals: string[];
  distill: {
    title: string;
    format: string;
    basedOn: string;
    outline: Array<{
      heading: string;
      bullets: string[];
    }>;
    cards: string[];
  };
}

export interface InsightMetric {
  label: string;
  value: string;
  caption: string;
}

export interface ContinueQuestion {
  id: string;
  topicId: string;
  question: string;
  note: string;
}

export type DistillOutputType = "文章提纲" | "复盘框架" | "观点卡片";

export interface SavedDistill {
  id: string;
  topicId: string;
  title: string;
  outputType: DistillOutputType;
  content: string;
  sourceThoughtIds: string[];
  createdAt: string;
  updatedAt?: string;
}

export interface CalendarDaySummary {
  date: string;
  dateLabel: string;
  monthLabel: string;
  dayOfMonth: number;
  thoughtCount: number;
  organizedCount: number;
  draftCount: number;
  topicNames: string[];
  representativeThought?: string;
}

export interface QuantumXDataSnapshot {
  thoughts: Thought[];
  topics: Topic[];
  savedDistills: SavedDistill[];
  captureDraft: string;
}

export interface SnapshotSummary {
  thoughts: number;
  topics: number;
  drafts: number;
  hasCaptureDraft: boolean;
  latestActivityAt?: string;
}

export interface QuantumXDataExport {
  app: "QuantumX";
  version: 1;
  exportedAt: string;
  note: string;
  data: QuantumXDataSnapshot;
}

export interface CloudSyncMetadata {
  lastLocalSavedAt?: string;
  lastPushedAt?: string;
  lastPulledAt?: string;
  lastKnownCloudSummary?: SnapshotSummary;
}

export type CloudSyncState =
  | "local"
  | "pending"
  | "syncing"
  | "synced"
  | "error";

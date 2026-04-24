import { statusLabel } from "./visualization";
import type { SavedDistill, Thought, Topic } from "../types";

export type SearchResultKind = "thought" | "draft";

export interface SearchResult {
  id: string;
  kind: SearchResultKind;
  title: string;
  body: string;
  date: string;
  topicIds: string[];
  status?: string;
  score: number;
  reasons: string[];
}

export interface SearchFilters {
  kind: "all" | SearchResultKind;
  topicId: string;
  status: string;
}

function normalizeSearchText(value: string) {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function tokenize(query: string) {
  const normalized = normalizeSearchText(query);
  if (!normalized) return [];
  const parts = normalized.split(/[,\s，。；;、]+/).filter(Boolean);
  return Array.from(new Set([normalized, ...parts])).filter((token) => token.length > 0);
}

function scoreText(
  text: string,
  tokens: string[],
  weight: number,
  reason: string,
): { score: number; reasons: string[] } {
  const normalized = normalizeSearchText(text);
  const matched = tokens.filter((token) => normalized.includes(token));
  if (matched.length === 0) return { score: 0, reasons: [] };

  return {
    score: matched.length * weight,
    reasons: [`${reason}：${matched.slice(0, 3).join(" / ")}`],
  };
}

function topicNames(topicIds: string[], topics: Topic[]) {
  return topics
    .filter((topic) => topicIds.includes(topic.id))
    .map((topic) => topic.name);
}

function thoughtResult(thought: Thought, topics: Topic[], tokens: string[]): SearchResult {
  const names = topicNames(thought.topicIds, topics);
  const parts = [
    scoreText(thought.content, tokens, 6, "原文命中"),
    scoreText(thought.summary, tokens, 4, "摘要命中"),
    scoreText(names.join(" "), tokens, 3, "主题命中"),
    scoreText(thought.source, tokens, 2, "来源命中"),
    scoreText(statusLabel(thought.status), tokens, 1, "状态命中"),
  ];
  const score = parts.reduce((sum, part) => sum + part.score, 0);
  const reasons = parts.flatMap((part) => part.reasons);

  return {
    id: thought.id,
    kind: "thought",
    title: thought.summary,
    body: thought.content,
    date: thought.createdAt,
    topicIds: thought.topicIds,
    status: thought.status,
    score,
    reasons,
  };
}

function draftResult(
  draft: SavedDistill,
  topics: Topic[],
  tokens: string[],
): SearchResult {
  const topic = topics.find((item) => item.id === draft.topicId);
  const parts = [
    scoreText(draft.title, tokens, 5, "标题命中"),
    scoreText(draft.content, tokens, 4, "草稿内容命中"),
    scoreText(draft.outputType, tokens, 2, "输出类型命中"),
    scoreText(topic?.name ?? "", tokens, 3, "主题命中"),
  ];
  const score = parts.reduce((sum, part) => sum + part.score, 0);
  const reasons = parts.flatMap((part) => part.reasons);

  return {
    id: draft.id,
    kind: "draft",
    title: draft.title,
    body: draft.content,
    date: draft.updatedAt ?? draft.createdAt,
    topicIds: draft.topicId ? [draft.topicId] : [],
    score,
    reasons,
  };
}

function passesFilters(result: SearchResult, filters: SearchFilters) {
  if (filters.kind !== "all" && result.kind !== filters.kind) return false;
  if (filters.topicId !== "all" && !result.topicIds.includes(filters.topicId)) {
    return false;
  }
  if (filters.status !== "all" && result.status !== filters.status) return false;
  return true;
}

export function searchWorkspace(
  query: string,
  filters: SearchFilters,
  thoughts: Thought[],
  topics: Topic[],
  savedDistills: SavedDistill[],
): SearchResult[] {
  const tokens = tokenize(query);
  const allResults = [
    ...thoughts.map((thought) => thoughtResult(thought, topics, tokens)),
    ...savedDistills.map((draft) => draftResult(draft, topics, tokens)),
  ];

  if (tokens.length === 0) {
    return allResults
      .filter((result) => passesFilters(result, filters))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 24)
      .map((result) => ({
        ...result,
        score: 1,
        reasons: result.reasons.length > 0 ? result.reasons : ["最近更新"],
      }));
  }

  return allResults
    .filter((result) => result.score > 0)
    .filter((result) => passesFilters(result, filters))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    })
    .slice(0, 40);
}

export function getSearchSuggestions(thoughts: Thought[], topics: Topic[]) {
  const topicNames = topics.slice(0, 4).map((topic) => topic.name);
  const repeatedWords = thoughts
    .flatMap((thought) => thought.questions)
    .map((question) => question.replace(/[？?]/g, ""))
    .slice(0, 4);

  return Array.from(new Set([...topicNames, ...repeatedWords])).slice(0, 6);
}

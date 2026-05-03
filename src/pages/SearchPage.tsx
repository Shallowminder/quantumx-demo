import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  BookOpenText,
  Check,
  FileText,
  Filter,
  Pin,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import { MemoryMatchCard } from "../components/MemoryMatchCard";
import { TopicBadge } from "../components/TopicBadge";
import { formatMonthDay } from "../lib/date";
import {
  getSearchSuggestions,
  searchWorkspace,
  type SearchFilters,
  type SearchResult,
} from "../lib/search";
import { statusLabel } from "../lib/visualization";
import {
  fetchRelatedMemoryResult,
  type RecallSource,
  type RecallStrategy,
} from "../services/recallRepository";
import { recordMemoryFeedback } from "../services/memoryFeedbackRepository";
import type {
  MemoryFeedbackType,
  MemoryMatch,
  SavedDistill,
  Thought,
  ThoughtStatus,
  Topic,
} from "../types";

interface SearchPageProps {
  savedDistills: SavedDistill[];
  thoughts: Thought[];
  topics: Topic[];
  onContinueFromThought: (thought: Thought) => void;
  onNavigateDistill: () => void;
  onOpenThought: (thoughtId: string) => void;
  onOpenTopic: (topicId: string) => void;
}

const thoughtStatuses: ThoughtStatus[] = [
  "inbox",
  "linked",
  "themed",
  "distilled",
  "archived",
];

function resultKindLabel(kind: SearchResult["kind"]) {
  return kind === "thought" ? "想法" : "草稿";
}

const recallStrategyLabels: Record<RecallStrategy, string> = {
  local: "本地规则",
  lexical: "关键词召回",
  semantic: "语义召回",
  empty: "暂无语义结果",
};

function passesSearchFilters(result: SearchResult, filters: SearchFilters) {
  if (filters.kind !== "all" && result.kind !== filters.kind) return false;
  if (filters.topicId !== "all" && !result.topicIds.includes(filters.topicId)) {
    return false;
  }
  if (filters.status !== "all" && result.status !== filters.status) return false;
  return true;
}

function semanticResult(
  match: MemoryMatch,
  recallStrategy: RecallStrategy,
): SearchResult {
  return {
    id: match.thought.id,
    kind: "thought",
    title: match.thought.summary,
    body: match.thought.content,
    date: match.thought.createdAt,
    topicIds: match.thought.topicIds,
    status: match.thought.status,
    score: 8 + match.score * 12,
    reasons: [`${recallStrategyLabels[recallStrategy]}：${match.reason}`],
  };
}

function mergeSearchResults(
  localResults: SearchResult[],
  semanticResults: SearchResult[],
  filters: SearchFilters,
) {
  const merged = new Map<string, SearchResult>();

  localResults.forEach((result) => {
    merged.set(`${result.kind}:${result.id}`, result);
  });

  semanticResults.forEach((result) => {
    const key = `${result.kind}:${result.id}`;
    const existing = merged.get(key);
    if (!existing) {
      merged.set(key, result);
      return;
    }

    merged.set(key, {
      ...existing,
      score: existing.score + result.score,
      reasons: Array.from(new Set([...result.reasons, ...existing.reasons])),
    });
  });

  return Array.from(merged.values())
    .filter((result) => passesSearchFilters(result, filters))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    })
    .slice(0, 40);
}

function sortPinnedResults(results: SearchResult[], pinnedIds: string[]) {
  if (pinnedIds.length === 0) return results;
  return [...results].sort((a, b) => {
    const aPinned = a.kind === "thought" && pinnedIds.includes(a.id);
    const bPinned = b.kind === "thought" && pinnedIds.includes(b.id);
    if (aPinned === bPinned) return 0;
    return aPinned ? -1 : 1;
  });
}

export function SearchPage({
  savedDistills,
  thoughts,
  topics,
  onContinueFromThought,
  onNavigateDistill,
  onOpenThought,
  onOpenTopic,
}: SearchPageProps) {
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<SearchFilters>({
    kind: "all",
    topicId: "all",
    status: "all",
  });
  const [semanticMatches, setSemanticMatches] = useState<MemoryMatch[]>([]);
  const [recallSource, setRecallSource] = useState<RecallSource>("local");
  const [recallStrategy, setRecallStrategy] = useState<RecallStrategy>("local");
  const [recallLoading, setRecallLoading] = useState(false);
  const [feedback, setFeedback] = useState<Record<string, MemoryFeedbackType>>({});
  const [pinnedIds, setPinnedIds] = useState<string[]>([]);
  const [expandedActionIds, setExpandedActionIds] = useState<string[]>([]);
  const suggestions = useMemo(
    () => getSearchSuggestions(thoughts, topics),
    [thoughts, topics],
  );
  const localResults = useMemo(
    () => searchWorkspace(query, filters, thoughts, topics, savedDistills),
    [filters, query, savedDistills, thoughts, topics],
  );
  const semanticResults = useMemo(
    () =>
      semanticMatches.map((match) => semanticResult(match, recallStrategy)),
    [recallStrategy, semanticMatches],
  );
  const results = useMemo(
    () => mergeSearchResults(localResults, semanticResults, filters),
    [filters, localResults, semanticResults],
  );
  const visibleResults = useMemo(
    () => sortPinnedResults(results, pinnedIds),
    [pinnedIds, results],
  );
  const semanticMatchByThoughtId = useMemo(
    () => new Map(semanticMatches.map((match) => [match.thought.id, match])),
    [semanticMatches],
  );
  const recallLabel = recallLoading
    ? "语义匹配中"
    : recallSource === "cloud"
      ? recallStrategyLabels[recallStrategy]
      : "本地搜索";

  useEffect(() => {
    const cleanQuery = query.trim();
    let cancelled = false;
    setSemanticMatches([]);
    setRecallSource("local");
    setRecallStrategy("local");

    if (cleanQuery.length < 2 || thoughts.length === 0) {
      setRecallLoading(false);
      return undefined;
    }

    setRecallLoading(true);
    const timer = window.setTimeout(async () => {
      const result = await fetchRelatedMemoryResult(cleanQuery, thoughts, topics, 12);
      if (cancelled) return;
      setSemanticMatches(result.matches);
      setRecallSource(result.source);
      setRecallStrategy(result.strategy);
      setRecallLoading(false);
    }, 280);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query, thoughts, topics]);

  function openResult(result: SearchResult) {
    if (result.kind === "thought") {
      onOpenThought(result.id);
      return;
    }
    onNavigateDistill();
  }

  function persistFeedback(thoughtId: string, feedbackType: MemoryFeedbackType) {
    setFeedback((current) => ({
      ...current,
      [thoughtId]: feedbackType,
    }));
    void recordMemoryFeedback({
      feedbackType,
      targetThoughtId: thoughtId,
      context: query,
    }).catch(() => {
      // Search feedback should stay lightweight even when cloud writes fail.
    });
  }

  function togglePinned(thoughtId: string) {
    setPinnedIds((current) => {
      const alreadyPinned = current.includes(thoughtId);
      if (alreadyPinned) return current.filter((id) => id !== thoughtId);
      persistFeedback(thoughtId, "pinned");
      return [thoughtId, ...current];
    });
  }

  function toggleExpandedActions(resultId: string) {
    setExpandedActionIds((current) =>
      current.includes(resultId)
        ? current.filter((id) => id !== resultId)
        : [...current, resultId],
    );
  }

  return (
    <div className="mx-auto max-w-6xl">
      <header className="frost-panel-strong mb-6 rounded-[28px] px-6 py-7 sm:px-8">
        <div className="mb-3 flex items-center gap-2 text-sm text-muted">
          <Search size={16} strokeWidth={1.8} />
          本地搜索 + 语义召回
        </div>
        <h1 className="text-3xl font-semibold tracking-normal text-ink sm:text-4xl">
          找回想法
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-muted">
          先用本地全文搜索命中明确内容，再用云端 recall 把语义相近的旧想法带回来。
          没有登录或云端不可用时，会自动回到本地规则。
        </p>
      </header>

      <section className="frost-panel rounded-[26px] p-4 sm:p-5">
        <label className="relative block">
          <Search
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted"
            size={18}
            strokeWidth={1.8}
          />
          <input
            className="theme-input w-full rounded-xl py-4 pl-11 pr-4 text-[15px] text-ink outline-none transition placeholder:text-muted"
            placeholder="搜索旧记录、主题、草稿，比如：AI 工具、写作方法、复盘..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>

        <div className="mt-4 flex flex-wrap gap-2">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion}
              className="theme-button-secondary rounded-full px-3 py-1.5 text-sm text-muted transition hover:text-ink"
              type="button"
              onClick={() => setQuery(suggestion)}
            >
              {suggestion}
            </button>
          ))}
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <label className="block">
            <span className="mb-1 flex items-center gap-1.5 text-xs text-muted">
              <Filter size={13} strokeWidth={1.8} />
              类型
            </span>
            <select
              className="theme-input w-full rounded-lg px-3 py-2 text-sm text-ink outline-none"
              value={filters.kind}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  kind: event.target.value as SearchFilters["kind"],
                }))
              }
            >
              <option value="all">全部</option>
              <option value="thought">想法</option>
              <option value="draft">草稿</option>
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-xs text-muted">主题</span>
            <select
              className="theme-input w-full rounded-lg px-3 py-2 text-sm text-ink outline-none"
              value={filters.topicId}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  topicId: event.target.value,
                }))
              }
            >
              <option value="all">全部主题</option>
              {topics.map((topic) => (
                <option key={topic.id} value={topic.id}>
                  {topic.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-xs text-muted">想法状态</span>
            <select
              className="theme-input w-full rounded-lg px-3 py-2 text-sm text-ink outline-none"
              value={filters.status}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  status: event.target.value,
                }))
              }
            >
              <option value="all">全部状态</option>
              {thoughtStatuses.map((status) => (
                <option key={status} value={status}>
                  {statusLabel(status)}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold text-ink">
              {query.trim() ? "搜索结果" : "最近可找回的材料"}
            </h2>
            <div className="flex items-center gap-2">
              <span className="theme-pill rounded-full px-2.5 py-1 text-xs text-muted">
                {recallLabel}
              </span>
              <span className="text-sm text-muted">{visibleResults.length} 条</span>
            </div>
          </div>

          {visibleResults.length === 0 ? (
            <div className="frost-panel rounded-[26px] p-8 text-center">
              <div className="theme-surface-soft mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl text-muted">
                <Search size={18} strokeWidth={1.8} />
              </div>
              <p className="text-sm leading-7 text-muted">
                暂时没有找到匹配内容。可以换一个更短的词，或者先回到 Today 记录新的线索。
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {visibleResults.map((result) => {
                const resultTopics = topics.filter((topic) =>
                  result.topicIds.includes(topic.id),
                );
                const sourceThought =
                  result.kind === "thought"
                    ? thoughts.find((thought) => thought.id === result.id)
                    : undefined;
                const semanticMatch =
                  result.kind === "thought"
                    ? semanticMatchByThoughtId.get(result.id)
                    : undefined;
                const isPinned =
                  result.kind === "thought" && pinnedIds.includes(result.id);
                const resultFeedback =
                  result.kind === "thought" ? feedback[result.id] : undefined;
                const actionsExpanded = expandedActionIds.includes(result.id);

                return (
                  <article
                    key={`${result.kind}-${result.id}`}
                    className="frost-panel rounded-[22px] p-4 transition"
                  >
                    <button
                      className="w-full text-left"
                      type="button"
                      onClick={() => openResult(result)}
                    >
                      <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-muted">
                        <span className="theme-card-soft inline-flex items-center gap-1 rounded-full px-2 py-0.5">
                          {result.kind === "thought" ? (
                            <FileText size={12} strokeWidth={1.8} />
                          ) : (
                            <BookOpenText size={12} strokeWidth={1.8} />
                          )}
                          {resultKindLabel(result.kind)}
                        </span>
                        <span>{formatMonthDay(result.date)}</span>
                        {result.status && (
                          <span>{statusLabel(result.status as ThoughtStatus)}</span>
                        )}
                        {semanticMatch && (
                          <span>{recallStrategyLabels[recallStrategy]}</span>
                        )}
                        {isPinned && <span>已固定</span>}
                      </div>
                      <h3 className="mb-2 text-[15px] font-semibold text-ink">
                        {result.title}
                      </h3>
                      <p className="line-clamp-3 text-sm leading-7 text-muted">
                        {result.body}
                      </p>
                    </button>

                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      {resultTopics.map((topic) => (
                        <button
                          key={topic.id}
                          type="button"
                          onClick={() => onOpenTopic(topic.id)}
                        >
                          <TopicBadge topic={topic} />
                        </button>
                      ))}
                    </div>

                    <div className="theme-surface-soft mt-4 rounded-lg px-3 py-2 text-xs leading-5 text-muted">
                      {result.reasons.length > 0
                        ? result.reasons.slice(0, 2).join(" · ")
                        : "最近更新"}
                    </div>

                    {semanticMatch && (
                      <div className="mt-4">
                        <MemoryMatchCard
                          compact
                          match={semanticMatch}
                          onOpenThought={onOpenThought}
                        />
                      </div>
                    )}

                    {sourceThought && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        <button
                          className="theme-button-muted inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs transition"
                          type="button"
                          onClick={() => onContinueFromThought(sourceThought)}
                        >
                          从这条继续写
                          <ArrowRight size={13} strokeWidth={1.8} />
                        </button>
                        <button
                          className="theme-button-muted inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs transition sm:hidden"
                          type="button"
                          onClick={() => toggleExpandedActions(result.id)}
                        >
                          {actionsExpanded ? "收起反馈" : "反馈"}
                        </button>
                        <div
                          className={`w-full flex-wrap gap-1.5 sm:flex sm:w-auto ${
                            actionsExpanded ? "flex" : "hidden"
                          }`}
                        >
                          <button
                            className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs transition ${
                              resultFeedback === "helpful"
                                ? "theme-accent-tint"
                                : "theme-button-muted"
                            }`}
                            type="button"
                            onClick={() => persistFeedback(sourceThought.id, "helpful")}
                          >
                            <Check size={13} strokeWidth={1.8} />
                            有帮助
                          </button>
                          <button
                            className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs transition ${
                              resultFeedback === "irrelevant"
                                ? "theme-danger-tint"
                                : "theme-button-muted"
                            }`}
                            type="button"
                            onClick={() => persistFeedback(sourceThought.id, "irrelevant")}
                          >
                            <X size={13} strokeWidth={1.8} />
                            不相关
                          </button>
                          <button
                            className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs transition ${
                              isPinned ? "theme-warning-tint" : "theme-button-muted"
                            }`}
                            type="button"
                            onClick={() => togglePinned(sourceThought.id)}
                          >
                            <Pin size={13} strokeWidth={1.8} />
                            固定
                          </button>
                          {sourceThought.topicIds.length > 0 && (
                            <button
                              className={`rounded-md px-2.5 py-1.5 text-xs transition ${
                                resultFeedback === "same_topic"
                                  ? "theme-accent-tint"
                                  : "theme-button-muted"
                              }`}
                              type="button"
                              onClick={() => persistFeedback(sourceThought.id, "same_topic")}
                            >
                              标记同主题
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </div>

        <aside className="space-y-4">
          <div className="frost-panel rounded-[1.25rem] p-5">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink">
              <Sparkles size={16} strokeWidth={1.8} />
              为什么先做搜索
            </div>
            <p className="text-sm leading-7 text-muted">
              真正可用的 QuantumX 必须能把旧材料找回来。这里会先做直接命中，
              再把云端语义召回结果合并进来。
            </p>
          </div>

          <div className="frost-panel rounded-[1.25rem] p-5">
            <div className="mb-3 text-sm font-semibold text-ink">当前召回状态</div>
            <div className="space-y-3 text-sm leading-6 text-muted">
              <p>1. 本地搜索：标题、正文、主题、草稿直接命中。</p>
              <p>2. 云端 recall：复用 embedding，把相近想法排进结果。</p>
              <p>3. 当前策略：{recallLabel}。</p>
            </div>
          </div>
        </aside>
      </section>
    </div>
  );
}

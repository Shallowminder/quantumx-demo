import { useMemo, useState } from "react";
import {
  ArrowRight,
  BookOpenText,
  FileText,
  Filter,
  Search,
  Sparkles,
} from "lucide-react";
import { TopicBadge } from "../components/TopicBadge";
import { formatMonthDay } from "../lib/date";
import {
  getSearchSuggestions,
  searchWorkspace,
  type SearchFilters,
  type SearchResult,
} from "../lib/search";
import { statusLabel } from "../lib/visualization";
import type { SavedDistill, Thought, ThoughtStatus, Topic } from "../types";

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
  const suggestions = useMemo(
    () => getSearchSuggestions(thoughts, topics),
    [thoughts, topics],
  );
  const results = useMemo(
    () => searchWorkspace(query, filters, thoughts, topics, savedDistills),
    [filters, query, savedDistills, thoughts, topics],
  );

  function openResult(result: SearchResult) {
    if (result.kind === "thought") {
      onOpenThought(result.id);
      return;
    }
    onNavigateDistill();
  }

  return (
    <div className="mx-auto max-w-6xl">
      <header className="mb-6 rounded-[1.35rem] bg-white/60 px-6 py-7 shadow-sm sm:px-8">
        <div className="mb-3 flex items-center gap-2 text-sm text-muted">
          <Search size={16} strokeWidth={1.8} />
          本地搜索
        </div>
        <h1 className="text-3xl font-semibold tracking-normal text-ink sm:text-4xl">
          找回想法
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-muted">
          先用本地全文搜索把旧记录、主题和草稿找回来。后续接入 embedding 后，
          这里会升级成真正的语义召回。
        </p>
      </header>

      <section className="mb-5 rounded-[1.25rem] bg-white p-4 shadow-soft sm:p-5">
        <label className="relative block">
          <Search
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted"
            size={18}
            strokeWidth={1.8}
          />
          <input
            className="w-full rounded-xl border border-line bg-canvas py-4 pl-11 pr-4 text-[15px] text-ink outline-none transition placeholder:text-muted focus:border-sage/45 focus:bg-white"
            placeholder="搜索旧记录、主题、草稿，比如：AI 工具、写作方法、复盘..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>

        <div className="mt-4 flex flex-wrap gap-2">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion}
              className="rounded-full border border-line bg-canvas px-3 py-1.5 text-sm text-muted transition hover:border-sage/40 hover:bg-white hover:text-ink"
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
              className="w-full rounded-lg border border-line bg-canvas px-3 py-2 text-sm text-ink outline-none focus:border-sage/45"
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
              className="w-full rounded-lg border border-line bg-canvas px-3 py-2 text-sm text-ink outline-none focus:border-sage/45"
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
              className="w-full rounded-lg border border-line bg-canvas px-3 py-2 text-sm text-ink outline-none focus:border-sage/45"
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
            <span className="text-sm text-muted">{results.length} 条</span>
          </div>

          {results.length === 0 ? (
            <div className="rounded-[1.25rem] bg-white p-8 text-center shadow-sm">
              <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-canvas text-muted">
                <Search size={18} strokeWidth={1.8} />
              </div>
              <p className="text-sm leading-7 text-muted">
                暂时没有找到匹配内容。可以换一个更短的词，或者先回到 Today 记录新的线索。
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {results.map((result) => {
                const resultTopics = topics.filter((topic) =>
                  result.topicIds.includes(topic.id),
                );
                const sourceThought =
                  result.kind === "thought"
                    ? thoughts.find((thought) => thought.id === result.id)
                    : undefined;

                return (
                  <article
                    key={`${result.kind}-${result.id}`}
                    className="rounded-[1.05rem] bg-white p-4 shadow-sm transition hover:shadow-soft"
                  >
                    <button
                      className="w-full text-left"
                      type="button"
                      onClick={() => openResult(result)}
                    >
                      <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-muted">
                        <span className="inline-flex items-center gap-1 rounded-full bg-canvas px-2 py-0.5">
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

                    <div className="mt-4 rounded-lg bg-canvas px-3 py-2 text-xs leading-5 text-muted">
                      {result.reasons.length > 0
                        ? result.reasons.slice(0, 2).join(" · ")
                        : "最近更新"}
                    </div>

                    {sourceThought && (
                      <button
                        className="mt-3 inline-flex items-center gap-1 rounded-md border border-line bg-white px-2.5 py-1.5 text-xs text-muted transition hover:border-sage/40 hover:text-ink"
                        type="button"
                        onClick={() => onContinueFromThought(sourceThought)}
                      >
                        从这条继续写
                        <ArrowRight size={13} strokeWidth={1.8} />
                      </button>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </div>

        <aside className="space-y-4">
          <div className="rounded-[1.25rem] bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink">
              <Sparkles size={16} strokeWidth={1.8} />
              为什么先做搜索
            </div>
            <p className="text-sm leading-7 text-muted">
              真正可用的 QuantumX 必须能把旧材料找回来。本地搜索是第一步，
              后续会接入语义向量召回，让相近问题也能被带回。
            </p>
          </div>

          <div className="rounded-[1.25rem] bg-white p-5 shadow-sm">
            <div className="mb-3 text-sm font-semibold text-ink">下一步会升级</div>
            <div className="space-y-3 text-sm leading-6 text-muted">
              <p>1. 全文搜索接数据库索引。</p>
              <p>2. 记录生成 embedding。</p>
              <p>3. 搜索结果显示语义相似原因和用户反馈。</p>
            </div>
          </div>
        </aside>
      </section>
    </div>
  );
}

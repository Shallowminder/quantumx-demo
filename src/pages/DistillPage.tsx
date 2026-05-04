import { useEffect, useMemo, useState } from "react";
import {
  BookOpenText,
  CheckCircle2,
  Copy,
  FilePenLine,
  LoaderCircle,
  Save,
  Sparkles,
  Trash2,
} from "lucide-react";
import { TopicBadge } from "../components/TopicBadge";
import { SourceComposition } from "../components/SourceComposition";
import { formatMonthDay } from "../lib/date";
import { generateCloudDistill } from "../services/distillRepository";
import type {
  DistillOutputType,
  SavedDistill,
  Thought,
  ThoughtStatus,
  Topic,
} from "../types";

interface DistillPageProps {
  savedDistills: SavedDistill[];
  thoughts: Thought[];
  topics: Topic[];
  onDeleteDistill: (draftId: string) => void;
  onSaveDistill: (draft: SavedDistill) => void;
  onUpdateDistill: (draft: SavedDistill) => void;
}

const outputTypes: DistillOutputType[] = ["文章提纲", "复盘框架", "观点卡片"];
const thoughtStatuses: ThoughtStatus[] = [
  "inbox",
  "linked",
  "themed",
  "distilled",
  "archived",
];
const statusLabels: Record<ThoughtStatus, string> = {
  inbox: "未整理",
  linked: "已关联",
  themed: "已加入主题",
  distilled: "已用于蒸馏",
  archived: "已归档",
};

function buildDistillContent(
  topic: Topic,
  selectedThoughts: Thought[],
  outputType: DistillOutputType,
): string {
  const sourceLine = `基于 ${selectedThoughts.length} 条来源记录：${selectedThoughts
    .map((thought) => `「${thought.summary}」`)
    .join("、")}`;

  if (outputType === "观点卡片") {
    return [
      `# ${topic.name}：观点卡片`,
      "",
      sourceLine,
      "",
      ...topic.distill.cards.map((card, index) => `${index + 1}. ${card}`),
      "",
      "可继续补充：这张卡片最适合放进哪篇文章或复盘？",
    ].join("\n");
  }

  if (outputType === "复盘框架") {
    return [
      `# ${topic.name}：复盘框架`,
      "",
      sourceLine,
      "",
      "## 1. 最近反复出现的问题",
      selectedThoughts
        .slice(0, 3)
        .map((thought) => `- ${thought.summary}`)
        .join("\n"),
      "",
      "## 2. 这背后的原因",
      "- 哪些问题是重复出现的？",
      "- 哪些记录还停留在感受，需要继续追问？",
      "",
      "## 3. 下一步只做一件事",
      "- 从这些记录里选择一个最值得继续写的问题。",
    ].join("\n");
  }

  return [
    `# ${topic.distill.title}`,
    "",
    sourceLine,
    "",
    ...topic.distill.outline.flatMap((section, index) => [
      `## ${index + 1}. ${section.heading.replace(/^一、|^二、|^三、/, "")}`,
      ...section.bullets.map((bullet) => `- ${bullet}`),
      `- 来源：来自 ${Math.min(selectedThoughts.length, index + 2)} 条记录`,
      "",
    ]),
  ].join("\n");
}

export function DistillPage({
  savedDistills,
  thoughts,
  topics,
  onDeleteDistill,
  onSaveDistill,
  onUpdateDistill,
}: DistillPageProps) {
  const [selectedTopicId, setSelectedTopicId] = useState(topics[0]?.id ?? "");
  const [outputType, setOutputType] = useState<DistillOutputType>("文章提纲");
  const [activeDraftId, setActiveDraftId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationMessage, setGenerationMessage] = useState("");
  const selectedTopic =
    topics.find((topic) => topic.id === selectedTopicId) ?? topics[0];
  const sourceThoughts = useMemo(
    () => {
      if (!selectedTopic) return [];
      return thoughts.filter(
        (thought) =>
          selectedTopic.thoughtIds.includes(thought.id) ||
          thought.topicIds.includes(selectedTopic.id),
      );
    },
    [selectedTopic, thoughts],
  );
  const [selectedThoughtIds, setSelectedThoughtIds] = useState<string[]>(() =>
    sourceThoughts.slice(0, 4).map((thought) => thought.id),
  );
  const selectedThoughts = useMemo(
    () =>
      sourceThoughts.filter((thought) => selectedThoughtIds.includes(thought.id)),
    [selectedThoughtIds, sourceThoughts],
  );
  const sourceSummary = useMemo(() => {
    const validTimes = selectedThoughts
      .map((thought) => new Date(thought.createdAt).getTime())
      .filter((time) => Number.isFinite(time));
    const earliestTime = validTimes.length > 0 ? Math.min(...validTimes) : null;
    const latestTime = validTimes.length > 0 ? Math.max(...validTimes) : null;
    const statusCounts = thoughtStatuses.map((status) => ({
      status,
      count: selectedThoughts.filter((thought) => thought.status === status).length,
    }));

    return {
      earliestAt: earliestTime ? new Date(earliestTime).toISOString() : null,
      latestAt: latestTime ? new Date(latestTime).toISOString() : null,
      statusCounts,
    };
  }, [selectedThoughts]);
  const [editableContent, setEditableContent] = useState(() =>
    selectedTopic
      ? buildDistillContent(selectedTopic, selectedThoughts, outputType)
      : "",
  );

  useEffect(() => {
    if (activeDraftId) return;
    if (!selectedTopic) {
      setSelectedThoughtIds([]);
      return;
    }
    const nextIds = sourceThoughts.slice(0, 4).map((thought) => thought.id);
    setSelectedThoughtIds(nextIds);
  }, [activeDraftId, selectedTopic, selectedTopicId, sourceThoughts]);

  useEffect(() => {
    if (activeDraftId) return;
    if (!selectedTopic) {
      setEditableContent("");
      return;
    }
    setEditableContent(
      buildDistillContent(selectedTopic, selectedThoughts, outputType),
    );
  }, [activeDraftId, outputType, selectedThoughtIds, selectedTopic, selectedThoughts]);

  function toggleThought(thoughtId: string) {
    setSelectedThoughtIds((current) =>
      current.includes(thoughtId)
        ? current.filter((id) => id !== thoughtId)
        : [...current, thoughtId],
    );
  }

  async function generateDistill() {
    if (!selectedTopic) return;
    if (selectedThoughts.length === 0) return;

    setIsGenerating(true);
    setGenerationMessage("");
    setActiveDraftId(null);

    const fallbackContent = buildDistillContent(
      selectedTopic,
      selectedThoughts,
      outputType,
    );

    try {
      const result = await generateCloudDistill({
        outputType,
        topic: selectedTopic,
        thoughts: selectedThoughts,
      });

      if (result) {
        setEditableContent(result.content);
        setGenerationMessage("已使用云端 AI 生成，可继续编辑后保存。");
        return;
      }

      setEditableContent(fallbackContent);
      setGenerationMessage("当前未登录或未配置云端 AI，已使用本地模板生成。");
    } catch {
      setEditableContent(fallbackContent);
      setGenerationMessage("云端 AI 暂时不可用，已使用本地模板生成。");
    } finally {
      setIsGenerating(false);
    }
  }

  function saveDraft() {
    if (!selectedTopic) return;
    if (selectedThoughts.length === 0) return;

    if (activeDraftId) {
      const existing = savedDistills.find((draft) => draft.id === activeDraftId);
      if (existing) {
        onUpdateDistill({
          ...existing,
          title: `${selectedTopic.name} · ${outputType}`,
          outputType,
          content: editableContent,
          sourceThoughtIds: selectedThoughtIds,
          updatedAt: new Date().toISOString(),
        });
        return;
      }
    }

    onSaveDistill({
      id: `distill-${Date.now()}`,
      topicId: selectedTopic.id,
      title: `${selectedTopic.name} · ${outputType}`,
      outputType,
      content: editableContent,
      sourceThoughtIds: selectedThoughtIds,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  function openDraft(draft: SavedDistill) {
    setActiveDraftId(draft.id);
    setSelectedTopicId(draft.topicId);
    setOutputType(draft.outputType);
    setSelectedThoughtIds(draft.sourceThoughtIds);
    setEditableContent(draft.content);
    setGenerationMessage("");
  }

  async function copyMarkdown() {
    await navigator.clipboard.writeText(editableContent);
  }

  if (!selectedTopic) {
    return (
      <div className="frost-panel-strong rounded-[28px] p-6">
        <div className="mb-2 text-sm font-semibold text-ink">还没有可蒸馏的主题</div>
        <p className="text-sm leading-7 text-muted">
          蒸馏输出需要先有主题和来源记录。你可以先回到 Today 记录一点内容，或者在主题页先新建一个主题。
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-7 xl:grid-cols-[380px_minmax(0,1fr)]">
      <section className="order-2 space-y-4 xl:order-1">
        <header className="hidden xl:block">
          <div className="mb-2 flex items-center gap-2 text-sm text-muted">
            <BookOpenText size={16} strokeWidth={1.8} />
            基于你的历史记录
          </div>
          <h1 className="text-2xl font-semibold tracking-normal text-ink sm:text-3xl">
            蒸馏输出
          </h1>
        </header>

        <div className="frost-panel rounded-[24px] p-4">
          <div className="mb-3 text-sm font-semibold text-ink">选择主题</div>
          <div className="space-y-2">
            {topics.map((topic) => (
              <button
                key={topic.id}
                className={`w-full rounded-[20px] px-3.5 py-3.5 text-left transition ${
                  topic.id === selectedTopic.id
                    ? "theme-card-soft"
                    : "theme-card-overlay"
                }`}
                type="button"
                onClick={() => {
                  setActiveDraftId(null);
                  setSelectedTopicId(topic.id);
                  setGenerationMessage("");
                }}
              >
                <div className="mb-2 flex items-center justify-between gap-3">
                  <span className="text-sm font-medium text-ink">{topic.name}</span>
                  <span className="text-xs text-muted">{topic.distill.format}</span>
                </div>
                <p className="text-xs leading-5 text-muted">{topic.summary}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="frost-panel rounded-[24px] p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-sm font-semibold text-ink">选择来源记录</div>
            <span className="text-xs text-muted">已选 {selectedThoughts.length} 条</span>
          </div>
          <div className="space-y-2">
            {sourceThoughts.map((thought) => {
              const checked = selectedThoughtIds.includes(thought.id);
              return (
                <label
                  key={thought.id}
                  className={`block rounded-[20px] p-3.5 transition ${
                    checked ? "theme-card-soft" : "theme-card-overlay"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      checked={checked}
                      className="mt-1 accent-sage"
                      type="checkbox"
                      onChange={() => toggleThought(thought.id)}
                    />
                    <div>
                      <div className="mb-1 text-xs text-muted">
                        {formatMonthDay(thought.createdAt)} · {thought.source}
                      </div>
                      <p className="line-clamp-3 text-sm leading-6 text-ink">
                        {thought.content}
                      </p>
                    </div>
                  </div>
                </label>
              );
            })}
          </div>
        </div>

        <div className="frost-panel rounded-[24px] p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-sm font-semibold text-ink">草稿库</div>
            <span className="text-xs text-muted">{savedDistills.length} 份</span>
          </div>
          {savedDistills.length === 0 ? (
            <p className="theme-card-soft rounded-[20px] p-3 text-sm leading-6 text-muted">
              保存后的整理内容会出现在这里，可以回来继续编辑、复制或查看来源。
            </p>
          ) : (
            <div className="space-y-2">
              {savedDistills.map((draft) => (
                <article
                  key={draft.id}
                  className={`rounded-[20px] p-3.5 ${
                    activeDraftId === draft.id
                      ? "theme-card-soft"
                      : "theme-card-overlay"
                  }`}
                >
                  <button
                    className="w-full text-left"
                    type="button"
                    onClick={() => openDraft(draft)}
                  >
                    <div className="mb-1 text-sm font-medium text-ink">{draft.title}</div>
                    <div className="text-xs text-muted">
                      {formatMonthDay(draft.updatedAt ?? draft.createdAt)} · {draft.outputType} · 来源 {draft.sourceThoughtIds.length} 条
                    </div>
                  </button>
                  <button
                    className="theme-button-secondary mt-2 inline-flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-[11px] transition hover:text-ink"
                    type="button"
                    onClick={() => onDeleteDistill(draft.id)}
                  >
                    <Trash2 size={12} strokeWidth={1.8} />
                    删除
                  </button>
                </article>
              ))}
            </div>
          )}
        </div>

        {activeDraftId && (
          <div className="frost-panel rounded-[24px] p-4">
            <div className="mb-3 text-sm font-semibold text-ink">当前草稿来源</div>
            <div className="space-y-2">
              {selectedThoughts.map((thought) => (
                <div key={thought.id} className="theme-card-soft rounded-[20px] p-3">
                  <div className="mb-1 text-xs text-muted">
                    {formatMonthDay(thought.createdAt)} · {thought.source}
                  </div>
                  <p className="line-clamp-2 text-sm leading-6 text-ink">{thought.content}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      <section className="frost-panel-strong order-1 rounded-[30px] p-5 sm:p-7 xl:order-2">
        <div className="mb-5 xl:hidden">
          <div className="mb-2 flex items-center gap-2 text-sm text-muted">
            <BookOpenText size={16} strokeWidth={1.8} />
            基于你的历史记录
          </div>
          <h1 className="text-2xl font-semibold tracking-normal text-ink">
            蒸馏输出
          </h1>
        </div>

        <div className="mb-6 flex flex-col gap-3 border-b soft-divider pb-6 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <TopicBadge topic={selectedTopic} />
            <h2 className="mt-3 text-2xl font-semibold tracking-normal text-ink">
              {selectedTopic.name} 的整理草稿
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              这份内容来自你选中的 {selectedThoughts.length} 条记录，可以继续编辑后保存。
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:justify-end">
            <button
              className="theme-button-secondary inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition disabled:text-muted sm:w-auto"
              disabled={selectedThoughts.length === 0 || isGenerating}
              type="button"
              onClick={() => void generateDistill()}
            >
              {isGenerating ? (
                <LoaderCircle className="animate-spin" size={16} strokeWidth={1.8} />
              ) : (
                <Sparkles size={16} strokeWidth={1.8} />
              )}
              {isGenerating ? "生成中" : "AI 生成"}
            </button>
            <button
              className="theme-primary-button inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition disabled:text-muted sm:w-auto"
              disabled={selectedThoughts.length === 0}
              type="button"
              onClick={saveDraft}
            >
              <Save size={16} strokeWidth={1.8} />
              {activeDraftId ? "更新草稿" : "保存草稿"}
            </button>
          </div>
        </div>

        <section className="theme-card-soft mb-5 rounded-[24px] p-4">
          <div className="mb-1 flex items-center gap-2 text-sm font-semibold text-ink">
            <FilePenLine size={16} strokeWidth={1.8} />
            本次蒸馏来源
          </div>
          {selectedThoughts.length === 0 ? (
            <p className="mt-3 rounded-[20px] theme-card-overlay p-3 text-sm leading-6 text-muted">
              先选择主题或来源记录，这里会显示本次蒸馏使用了哪些材料。
            </p>
          ) : (
            <div className="mt-4 space-y-4">
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                <div className="theme-card-overlay rounded-[18px] p-3">
                  <div className="mb-1 text-xs text-muted">主题</div>
                  <div className="text-sm font-medium text-ink">{selectedTopic.name}</div>
                </div>
                <div className="theme-card-overlay rounded-[18px] p-3">
                  <div className="mb-1 text-xs text-muted">来源记录</div>
                  <div className="text-sm font-medium text-ink">
                    {selectedThoughts.length} 条
                  </div>
                </div>
                <div className="theme-card-overlay rounded-[18px] p-3">
                  <div className="mb-1 text-xs text-muted">时间跨度</div>
                  <div className="text-sm font-medium text-ink">
                    {sourceSummary.earliestAt && sourceSummary.latestAt
                      ? `${formatMonthDay(sourceSummary.earliestAt)} - ${formatMonthDay(
                          sourceSummary.latestAt,
                        )}`
                      : "暂无日期"}
                  </div>
                </div>
                <div className="theme-card-overlay rounded-[18px] p-3">
                  <div className="mb-1 text-xs text-muted">输出类型</div>
                  <div className="text-sm font-medium text-ink">{outputType}</div>
                </div>
              </div>

              <div>
                <div className="mb-2 text-xs text-muted">来源状态分布</div>
                <div className="flex flex-wrap gap-2">
                  {sourceSummary.statusCounts.map(({ status, count }) => (
                    <span
                      key={status}
                      className="theme-pill rounded-full px-2.5 py-1 text-xs text-muted"
                    >
                      {statusLabels[status]} {count}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </section>

        <div className="mb-4 flex flex-wrap gap-2">
          {outputTypes.map((type) => (
            <button
              key={type}
              className={`flex-1 rounded-full px-3.5 py-2 text-sm transition sm:flex-none ${
                outputType === type
                  ? "theme-primary-button"
                  : "theme-button-muted"
                }`}
              type="button"
              onClick={() => {
                setActiveDraftId(null);
                setOutputType(type);
                setGenerationMessage("");
              }}
            >
              {type}
            </button>
          ))}
        </div>

        <div className="mb-5">
          <SourceComposition
            outputType={outputType}
            sourceThoughts={selectedThoughts}
            topics={topics}
          />
        </div>

        {generationMessage && (
          <div className="theme-accent-soft mb-4 rounded-[20px] px-4 py-3 text-sm leading-6">
            {generationMessage}
          </div>
        )}

        <div className="mb-3 flex flex-wrap items-center gap-2 text-sm font-semibold text-ink">
          <FilePenLine size={16} strokeWidth={1.8} />
          <span className="flex-1">可编辑输出</span>
          <button
            className="theme-button-secondary inline-flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs transition hover:text-ink"
            type="button"
            onClick={copyMarkdown}
          >
            <Copy size={13} strokeWidth={1.8} />
            复制 Markdown
          </button>
        </div>
        <textarea
          className="theme-input min-h-[360px] w-full resize-y rounded-[24px] px-5 py-4 font-mono text-sm leading-7 text-ink outline-none transition sm:min-h-[520px]"
          value={editableContent}
          onChange={(event) => setEditableContent(event.target.value)}
        />

        <div className="frost-panel mt-4 rounded-[22px] px-4 py-3 text-sm leading-6 text-muted">
          <div className="mb-1 flex items-center gap-2 font-medium text-ink">
            <CheckCircle2 size={16} strokeWidth={1.8} />
            来源透明
          </div>
          每次生成都会保留来源记录数量和摘要，避免变成通用 AI 模板。
        </div>
      </section>
    </div>
  );
}

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
  const sourceThoughts = useMemo(
    () =>
      thoughts.filter(
        (thought) =>
          selectedTopic.thoughtIds.includes(thought.id) ||
          thought.topicIds.includes(selectedTopic.id),
      ),
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
  const [editableContent, setEditableContent] = useState(() =>
    buildDistillContent(selectedTopic, selectedThoughts, outputType),
  );

  useEffect(() => {
    if (activeDraftId) return;
    const nextIds = sourceThoughts.slice(0, 4).map((thought) => thought.id);
    setSelectedThoughtIds(nextIds);
  }, [activeDraftId, selectedTopicId, sourceThoughts]);

  useEffect(() => {
    if (activeDraftId) return;
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

  return (
    <div className="grid gap-7 xl:grid-cols-[380px_minmax(0,1fr)]">
      <section className="space-y-4">
        <header>
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
                    ? "bg-[rgba(247,244,238,0.98)]"
                    : "bg-white/55 hover:bg-white/88"
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
                    checked
                      ? "bg-[rgba(247,244,238,0.98)]"
                      : "bg-white/55 hover:bg-white/88"
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
            <p className="rounded-[20px] bg-[rgba(247,244,238,0.92)] p-3 text-sm leading-6 text-muted">
              保存后的整理内容会出现在这里，可以回来继续编辑、复制或查看来源。
            </p>
          ) : (
            <div className="space-y-2">
              {savedDistills.map((draft) => (
                <article
                  key={draft.id}
                  className={`rounded-[20px] p-3.5 ${
                    activeDraftId === draft.id
                      ? "bg-[rgba(247,244,238,0.98)]"
                      : "bg-white/55"
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
                    className="mt-2 inline-flex items-center gap-1 rounded-xl bg-[rgba(247,244,238,0.92)] px-2.5 py-1.5 text-[11px] text-muted transition hover:bg-white hover:text-ink"
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
                <div key={thought.id} className="rounded-[20px] bg-[rgba(247,244,238,0.92)] p-3">
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

      <section className="frost-panel-strong rounded-[30px] p-5 sm:p-7">
        <div className="mb-6 flex flex-col gap-3 border-b border-white/70 pb-6 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <TopicBadge topic={selectedTopic} />
            <h2 className="mt-3 text-2xl font-semibold tracking-normal text-ink">
              {selectedTopic.name} 的整理草稿
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              这份内容来自你选中的 {selectedThoughts.length} 条记录，可以继续编辑后保存。
            </p>
          </div>
          <div className="flex flex-wrap gap-2 sm:justify-end">
            <button
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[rgba(247,244,238,0.92)] px-4 py-2.5 text-sm font-medium text-ink transition hover:bg-white disabled:bg-stone-100 disabled:text-muted"
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
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-ink px-4 py-2.5 text-sm font-medium text-white transition hover:bg-black disabled:bg-stone-200 disabled:text-muted"
              disabled={selectedThoughts.length === 0}
              type="button"
              onClick={saveDraft}
            >
              <Save size={16} strokeWidth={1.8} />
              {activeDraftId ? "更新草稿" : "保存草稿"}
            </button>
          </div>
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          {outputTypes.map((type) => (
            <button
              key={type}
              className={`rounded-full px-3.5 py-2 text-sm transition ${
                outputType === type
                  ? "bg-ink text-white"
                  : "bg-[rgba(247,244,238,0.92)] text-muted hover:bg-white hover:text-ink"
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
          <div className="mb-4 rounded-[20px] bg-sage/10 px-4 py-3 text-sm leading-6 text-ink">
            {generationMessage}
          </div>
        )}

        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink">
          <FilePenLine size={16} strokeWidth={1.8} />
          <span className="flex-1">可编辑输出</span>
          <button
            className="inline-flex items-center gap-1 rounded-xl bg-[rgba(247,244,238,0.92)] px-3 py-1.5 text-xs text-muted transition hover:bg-white hover:text-ink"
            type="button"
            onClick={copyMarkdown}
          >
            <Copy size={13} strokeWidth={1.8} />
            复制 Markdown
          </button>
        </div>
        <textarea
          className="min-h-[520px] w-full resize-y rounded-[24px] border border-transparent bg-[rgba(247,244,238,0.94)] px-5 py-4 font-mono text-sm leading-7 text-ink outline-none transition focus:border-white focus:bg-white"
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

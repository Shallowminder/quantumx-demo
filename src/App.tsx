import { useEffect, useMemo, useState } from "react";
import { MobileNav } from "./components/MobileNav";
import { Sidebar } from "./components/Sidebar";
import { thoughts as seedThoughts, topics as seedTopics } from "./data/mockData";
import { createCapturedThought } from "./lib/memory";
import {
  CAPTURE_DRAFT_STORAGE_KEY,
  DISTILLS_STORAGE_KEY,
  normalizeDistills,
  normalizeThoughts,
  normalizeTopics,
  readStoredValue,
  THOUGHTS_STORAGE_KEY,
  TOPICS_STORAGE_KEY,
  writeStoredValue,
} from "./lib/persistence";
import { DataPage } from "./pages/DataPage";
import { DistillPage } from "./pages/DistillPage";
import { InsightsPage } from "./pages/InsightsPage";
import { PersonalHome } from "./pages/PersonalHome";
import { ThoughtDetailPage } from "./pages/ThoughtDetailPage";
import { TodayPage } from "./pages/TodayPage";
import { TopicsPage } from "./pages/TopicsPage";
import type {
  QuantumXDataSnapshot,
  SavedDistill,
  Thought,
  Topic,
  ViewKey,
} from "./types";

interface ToastState {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

export default function App() {
  const [activeView, setActiveView] = useState<ViewKey>("today");
  const [thoughts, setThoughts] = useState<Thought[]>(() =>
    normalizeThoughts(readStoredValue(THOUGHTS_STORAGE_KEY, seedThoughts)),
  );
  const [topics, setTopics] = useState<Topic[]>(() =>
    normalizeTopics(readStoredValue(TOPICS_STORAGE_KEY, seedTopics)),
  );
  const [selectedThoughtId, setSelectedThoughtId] = useState(seedThoughts[0].id);
  const [selectedTopicId, setSelectedTopicId] = useState(seedTopics[0].id);
  const [captureDraft, setCaptureDraft] = useState(() =>
    readStoredValue(CAPTURE_DRAFT_STORAGE_KEY, ""),
  );
  const [savedDistills, setSavedDistills] = useState<SavedDistill[]>(() =>
    normalizeDistills(readStoredValue(DISTILLS_STORAGE_KEY, [])),
  );
  const [toast, setToast] = useState<ToastState | null>(null);
  const [focusCaptureSignal, setFocusCaptureSignal] = useState(0);

  const selectedThought = useMemo(() => {
    return (
      thoughts.find((thought) => thought.id === selectedThoughtId) ??
      thoughts[0] ??
      seedThoughts[0]
    );
  }, [selectedThoughtId, thoughts]);

  function navigate(view: ViewKey) {
    setActiveView(view);
  }

  function openThought(thoughtId: string) {
    setSelectedThoughtId(thoughtId);
    setActiveView("detail");
  }

  function openTopic(topicId: string) {
    setSelectedTopicId(topicId);
    setActiveView("topics");
  }

  function captureThought(content: string) {
    const thought = createCapturedThought(content, thoughts, topics);
    setThoughts((current) => [thought, ...current]);
    setSelectedThoughtId(thought.id);
    setCaptureDraft("");
    setToast({
      message: `已保存到今日思考，发现 ${thought.relatedIds.length} 条相关旧想法。`,
      actionLabel: "撤销",
      onAction: () => {
        setThoughts((current) => current.filter((item) => item.id !== thought.id));
        setSelectedThoughtId(seedThoughts[0].id);
        setToast({ message: "已撤销刚才保存的想法。" });
      },
    });
  }

  function saveDistill(draft: SavedDistill) {
    setSavedDistills((current) => [draft, ...current]);
    setThoughts((current) =>
      current.map((thought) =>
        draft.sourceThoughtIds.includes(thought.id)
          ? { ...thought, status: "distilled" }
          : thought,
      ),
    );
    setToast({ message: "已保存为草稿，可以继续编辑或回到来源记录。" });
  }

  function updateDistill(draft: SavedDistill) {
    setSavedDistills((current) =>
      current.map((item) => (item.id === draft.id ? draft : item)),
    );
    setToast({ message: "草稿已更新。" });
  }

  function deleteDistill(draftId: string) {
    setSavedDistills((current) => current.filter((draft) => draft.id !== draftId));
    setToast({ message: "草稿已删除。" });
  }

  function updateThought(thoughtId: string, patch: Partial<Thought>) {
    setThoughts((current) =>
      current.map((thought) =>
        thought.id === thoughtId ? { ...thought, ...patch } : thought,
      ),
    );
    setToast({ message: "想法已更新。" });
  }

  function attachThoughtToTopic(thoughtId: string, topicId: string) {
    setThoughts((current) =>
      current.map((thought) => {
        if (thought.id !== thoughtId) return thought;
        const topicIds = Array.from(new Set([...thought.topicIds, topicId]));
        return { ...thought, topicIds, status: "themed" };
      }),
    );
    setTopics((current) =>
      current.map((topic) =>
        topic.id === topicId
          ? {
              ...topic,
              thoughtIds: Array.from(new Set([...topic.thoughtIds, thoughtId])),
              updatedAt: new Date().toISOString(),
            }
          : topic,
      ),
    );
    setToast({ message: "已加入同一主题。" });
  }

  function addTopic(name: string) {
    const cleanName = name.trim();
    if (!cleanName) return;
    const topic: Topic = {
      id: `topic-${Date.now()}`,
      name: cleanName,
      summary: "这是一个刚开始形成的新线索。",
      description: "先把相关想法放进来，等材料多一些后再整理总结。",
      updatedAt: new Date().toISOString(),
      accent: "stone",
      thoughtIds: [],
      signals: ["新线索", "待观察"],
      distill: {
        title: `${cleanName} 的整理草稿`,
        format: "文章提纲",
        basedOn: "基于你后续加入的记录生成",
        outline: [
          {
            heading: "一、这个主题目前在讨论什么",
            bullets: ["先收集几条原始记录，再判断它是否值得长期沉淀。"],
          },
        ],
        cards: ["新主题不急着定型，先让材料自然长出来。"],
      },
    };
    setTopics((current) => [topic, ...current]);
    setSelectedTopicId(topic.id);
    setToast({ message: `已创建主题「${cleanName}」。` });
  }

  function renameTopic(topicId: string, name: string) {
    const cleanName = name.trim();
    if (!cleanName) return;
    setTopics((current) =>
      current.map((topic) =>
        topic.id === topicId
          ? { ...topic, name: cleanName, updatedAt: new Date().toISOString() }
          : topic,
      ),
    );
    setToast({ message: "主题已重命名。" });
  }

  function continueFromThought(thought: Thought) {
    setActiveView("today");
    setCaptureDraft(`继续写：${thought.summary}\n\n`);
    setFocusCaptureSignal((value) => value + 1);
  }

  function importData(snapshot: QuantumXDataSnapshot) {
    const nextThoughts =
      snapshot.thoughts.length > 0 ? snapshot.thoughts : seedThoughts;
    const nextTopics = snapshot.topics.length > 0 ? snapshot.topics : seedTopics;

    setThoughts(nextThoughts);
    setTopics(nextTopics);
    setSavedDistills(snapshot.savedDistills);
    setCaptureDraft(snapshot.captureDraft);
    setSelectedThoughtId(nextThoughts[0].id);
    setSelectedTopicId(nextTopics[0].id);
    setActiveView("data");
    setToast({ message: "备份已恢复到当前浏览器。" });
  }

  useEffect(() => {
    writeStoredValue(THOUGHTS_STORAGE_KEY, thoughts);
  }, [thoughts]);

  useEffect(() => {
    writeStoredValue(TOPICS_STORAGE_KEY, topics);
  }, [topics]);

  useEffect(() => {
    writeStoredValue(CAPTURE_DRAFT_STORAGE_KEY, captureDraft);
  }, [captureDraft]);

  useEffect(() => {
    writeStoredValue(DISTILLS_STORAGE_KEY, savedDistills);
  }, [savedDistills]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setActiveView("today");
        setFocusCaptureSignal((value) => value + 1);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className="min-h-screen bg-paper text-ink">
      <div className="mx-auto flex min-h-screen max-w-[1480px] bg-canvas/70">
        <Sidebar activeView={activeView} onNavigate={navigate} />
        <main className="min-w-0 flex-1 px-4 pb-24 pt-4 sm:px-6 lg:px-8 lg:pb-8">
          {activeView === "today" && (
            <TodayPage
              draft={captureDraft}
              focusCaptureSignal={focusCaptureSignal}
              thoughts={thoughts}
              topics={topics}
              onCapture={captureThought}
              onDraftChange={setCaptureDraft}
              onContinueFromThought={continueFromThought}
              onRequestCaptureFocus={() =>
                setFocusCaptureSignal((value) => value + 1)
              }
              onOpenThought={openThought}
              onOpenTopic={openTopic}
            />
          )}

          {activeView === "home" && (
            <PersonalHome
              savedDistills={savedDistills}
              thoughts={thoughts}
              topics={topics}
              onContinueFromThought={continueFromThought}
              onNavigate={navigate}
              onOpenTopic={openTopic}
            />
          )}

          {activeView === "detail" && (
            <ThoughtDetailPage
              thought={selectedThought}
              thoughts={thoughts}
              topics={topics}
              onBack={() => setActiveView("today")}
              onAttachThoughtToTopic={attachThoughtToTopic}
              onContinueFromThought={continueFromThought}
              onGenerateFromThought={(thought) => {
                setSelectedTopicId(thought.topicIds[0] ?? topics[0].id);
                setActiveView("distill");
              }}
              onOpenThought={openThought}
              onOpenTopic={openTopic}
              onUpdateThought={updateThought}
            />
          )}

          {activeView === "topics" && (
            <TopicsPage
              savedDistills={savedDistills}
              selectedTopicId={selectedTopicId}
              thoughts={thoughts}
              topics={topics}
              onAddTopic={addTopic}
              onAttachThoughtToTopic={attachThoughtToTopic}
              onOpenThought={openThought}
              onRenameTopic={renameTopic}
              onSelectTopic={setSelectedTopicId}
            />
          )}

          {activeView === "distill" && (
            <DistillPage
              savedDistills={savedDistills}
              thoughts={thoughts}
              topics={topics}
              onDeleteDistill={deleteDistill}
              onSaveDistill={saveDistill}
              onUpdateDistill={updateDistill}
            />
          )}

          {activeView === "insights" && (
            <InsightsPage
              savedDistills={savedDistills}
              thoughts={thoughts}
              topics={topics}
              onNavigate={navigate}
              onOpenTopic={openTopic}
            />
          )}

          {activeView === "data" && (
            <DataPage
              captureDraft={captureDraft}
              savedDistills={savedDistills}
              thoughts={thoughts}
              topics={topics}
              onImportData={importData}
            />
          )}
        </main>
      </div>
      <MobileNav activeView={activeView} onNavigate={navigate} />
      {toast && (
        <div className="fixed bottom-20 left-1/2 z-30 flex w-[min(92vw,460px)] -translate-x-1/2 items-center justify-between gap-3 rounded-xl border border-line bg-white px-4 py-3 text-sm text-ink shadow-soft lg:bottom-6">
          <span>{toast.message}</span>
          {toast.actionLabel && toast.onAction && (
            <button
              className="shrink-0 rounded-md border border-line bg-canvas px-2.5 py-1 text-xs font-medium text-ink transition hover:border-sage/40 hover:bg-white"
              type="button"
              onClick={toast.onAction}
            >
              {toast.actionLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

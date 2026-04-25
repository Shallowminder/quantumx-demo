import { useEffect, useMemo, useRef, useState } from "react";
import { MobileNav } from "./components/MobileNav";
import { Sidebar } from "./components/Sidebar";
import { thoughts as seedThoughts, topics as seedTopics } from "./data/mockData";
import { createCapturedThought } from "./lib/memory";
import {
  CAPTURE_DRAFT_STORAGE_KEY,
  CLOUD_SYNC_METADATA_STORAGE_KEY,
  DISTILLS_STORAGE_KEY,
  normalizeCloudSyncMetadata,
  normalizeDistills,
  normalizeThoughts,
  normalizeTopics,
  readStoredValue,
  THOUGHTS_STORAGE_KEY,
  TOPICS_STORAGE_KEY,
} from "./lib/persistence";
import {
  migrateLocalSnapshotToSupabase,
} from "./services/cloudMigration";
import { authRepository } from "./services/authRepository";
import { DataPage } from "./pages/DataPage";
import { DistillPage } from "./pages/DistillPage";
import { InsightsPage } from "./pages/InsightsPage";
import { PersonalHome } from "./pages/PersonalHome";
import { SearchPage } from "./pages/SearchPage";
import { ThoughtDetailPage } from "./pages/ThoughtDetailPage";
import { TodayPage } from "./pages/TodayPage";
import { TopicsPage } from "./pages/TopicsPage";
import {
  localQuantumXRepository,
  supabaseQuantumXRepository,
} from "./services/quantumxRepository";
import type {
  AuthState,
} from "./services/authRepository";
import type {
  CloudSyncState,
  CloudSyncMetadata,
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

type DataMode = "local" | "cloud";
type ImportDataOptions = {
  activateDataView?: boolean;
  toastMessage?: string;
  dataMode?: DataMode;
  useSeedFallback?: boolean;
};

function createSnapshotSignature(snapshot: QuantumXDataSnapshot) {
  return JSON.stringify(snapshot);
}

const seedSnapshot: QuantumXDataSnapshot = {
  thoughts: seedThoughts,
  topics: seedTopics,
  savedDistills: [],
  captureDraft: "",
};

export default function App() {
  const initialCloudSyncMetadata = normalizeCloudSyncMetadata(
    readStoredValue(CLOUD_SYNC_METADATA_STORAGE_KEY, {}),
  );
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
  const [authState, setAuthState] = useState<AuthState>({
    configured: false,
    session: null,
  });
  const [cloudSyncMetadata, setCloudSyncMetadata] =
    useState<CloudSyncMetadata>(initialCloudSyncMetadata);
  const [dataMode, setDataMode] = useState<DataMode>("local");
  const [cloudSyncState, setCloudSyncState] =
    useState<CloudSyncState>("local");
  const [hydratedSessionId, setHydratedSessionId] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [focusCaptureSignal, setFocusCaptureSignal] = useState(0);
  const lastCloudSyncedSignatureRef = useRef<string | null>(null);
  const cloudSyncTimerRef = useRef<number | null>(null);
  const hasShownCloudSyncErrorRef = useRef(false);

  const selectedThought = useMemo(() => {
    return (
      thoughts.find((thought) => thought.id === selectedThoughtId) ??
      thoughts[0] ??
      seedThoughts[0]
    );
  }, [selectedThoughtId, thoughts]);

  const currentSnapshot = useMemo(
    () => ({ thoughts, topics, savedDistills, captureDraft }),
    [captureDraft, savedDistills, thoughts, topics],
  );

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

  function openDistill() {
    setActiveView("distill");
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

  function importData(
    snapshot: QuantumXDataSnapshot,
    options?: ImportDataOptions,
  ) {
    const useSeedFallback = options?.useSeedFallback ?? true;
    const nextThoughts =
      snapshot.thoughts.length > 0 || !useSeedFallback
        ? snapshot.thoughts
        : seedThoughts;
    const nextTopics =
      snapshot.topics.length > 0 || !useSeedFallback
        ? snapshot.topics
        : seedTopics;

    setThoughts(nextThoughts);
    setTopics(nextTopics);
    setSavedDistills(snapshot.savedDistills);
    setCaptureDraft(snapshot.captureDraft);
    setSelectedThoughtId(nextThoughts[0].id);
    setSelectedTopicId(nextTopics[0].id);
    setDataMode(options?.dataMode ?? "local");
    if (options?.dataMode === "cloud") {
      lastCloudSyncedSignatureRef.current = createSnapshotSignature(snapshot);
      hasShownCloudSyncErrorRef.current = false;
      setCloudSyncState("synced");
    } else {
      lastCloudSyncedSignatureRef.current = null;
      setCloudSyncState("local");
    }
    if (options?.activateDataView ?? true) {
      setActiveView("data");
    }
    if (options?.toastMessage) {
      setToast({ message: options.toastMessage });
    } else {
      setToast({ message: "备份已恢复到当前浏览器。" });
    }
  }

  useEffect(() => {
    let cancelled = false;

    void authRepository
      .getState()
      .then((state) => {
        if (cancelled) return;
        setAuthState(state);
      })
      .catch(() => {
        if (cancelled) return;
        setAuthState({ configured: false, session: null });
      });

    const unsubscribe = authRepository.onAuthChange((session) => {
      setAuthState((current) => ({
        configured: current.configured,
        session,
      }));
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    const sessionId = authState.session?.user.id;

    if (!sessionId) {
      setDataMode("local");
      setCloudSyncState("local");
      setHydratedSessionId(null);
      lastCloudSyncedSignatureRef.current = null;
      return;
    }

    const hasPreviousCloudLink =
      Boolean(cloudSyncMetadata.lastPushedAt) ||
      Boolean(cloudSyncMetadata.lastPulledAt) ||
      Boolean(cloudSyncMetadata.lastKnownCloudSummary);

    if (!hasPreviousCloudLink || hydratedSessionId === sessionId) {
      if (!hasPreviousCloudLink) {
        setDataMode("local");
      }
      return;
    }

    let cancelled = false;

    void supabaseQuantumXRepository
      .loadSnapshot(seedSnapshot)
      .then((snapshot) => {
        if (cancelled) return;
        importData(snapshot, {
          activateDataView: false,
          dataMode: "cloud",
          toastMessage: "已自动读取当前账号的云端数据。",
          useSeedFallback: false,
        });
        setHydratedSessionId(sessionId);
      })
      .catch(() => {
        if (cancelled) return;
        setDataMode("local");
        setCloudSyncState("error");
      });

    return () => {
      cancelled = true;
    };
  }, [authState.session, hydratedSessionId, seedSnapshot]);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        CLOUD_SYNC_METADATA_STORAGE_KEY,
        JSON.stringify(cloudSyncMetadata),
      );
    } catch {
      // Ignore local persistence failures and keep the in-memory state usable.
    }
  }, [cloudSyncMetadata]);

  useEffect(() => {
    const sessionId = authState.session?.user.id;
    if (dataMode !== "cloud" || !sessionId) {
      if (cloudSyncTimerRef.current) {
        window.clearTimeout(cloudSyncTimerRef.current);
        cloudSyncTimerRef.current = null;
      }
      return;
    }

    const signature = createSnapshotSignature(currentSnapshot);
    if (lastCloudSyncedSignatureRef.current === signature) {
      if (cloudSyncState !== "synced") {
        setCloudSyncState("synced");
      }
      return;
    }

    if (cloudSyncTimerRef.current) {
      window.clearTimeout(cloudSyncTimerRef.current);
    }

    if (cloudSyncState !== "pending") {
      setCloudSyncState("pending");
    }

    cloudSyncTimerRef.current = window.setTimeout(() => {
      setCloudSyncState("syncing");
      void migrateLocalSnapshotToSupabase(currentSnapshot)
        .then((result) => {
          lastCloudSyncedSignatureRef.current = signature;
          hasShownCloudSyncErrorRef.current = false;
          setCloudSyncState("synced");
          setCloudSyncMetadata((current) => ({
            ...current,
            lastPushedAt: new Date().toISOString(),
            lastKnownCloudSummary: result.summary,
          }));
        })
        .catch(() => {
          setCloudSyncState("error");
          if (hasShownCloudSyncErrorRef.current) return;
          hasShownCloudSyncErrorRef.current = true;
          setToast({
            message: "云端自动同步暂时失败，当前修改仍保存在这个浏览器里。",
          });
        });
    }, 1200);

    return () => {
      if (cloudSyncTimerRef.current) {
        window.clearTimeout(cloudSyncTimerRef.current);
        cloudSyncTimerRef.current = null;
      }
    };
  }, [authState.session, cloudSyncState, currentSnapshot, dataMode]);

  useEffect(() => {
    void localQuantumXRepository.saveThoughts(thoughts);
  }, [thoughts]);

  useEffect(() => {
    void localQuantumXRepository.saveTopics(topics);
  }, [topics]);

  useEffect(() => {
    void localQuantumXRepository.saveCaptureDraft(captureDraft);
  }, [captureDraft]);

  useEffect(() => {
    void localQuantumXRepository.saveDistills(savedDistills);
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

          {activeView === "search" && (
            <SearchPage
              savedDistills={savedDistills}
              thoughts={thoughts}
              topics={topics}
              onContinueFromThought={continueFromThought}
              onNavigateDistill={openDistill}
              onOpenThought={openThought}
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
              authState={authState}
              captureDraft={captureDraft}
              cloudSyncState={cloudSyncState}
              dataMode={dataMode}
              cloudSyncMetadata={cloudSyncMetadata}
              savedDistills={savedDistills}
              thoughts={thoughts}
              topics={topics}
              onImportData={importData}
              onSyncMetadataChange={setCloudSyncMetadata}
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

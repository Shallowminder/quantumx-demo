import { useEffect, useMemo, useRef, useState } from "react";
import { MobileNav } from "./components/MobileNav";
import { Sidebar } from "./components/Sidebar";
import { AccountMenu } from "./components/AccountMenu";
import { thoughts as seedThoughts, topics as seedTopics } from "./data/mockData";
import { createCapturedThought } from "./lib/memory";
import {
  readStylePreference,
  readThemePreference,
  resolveTheme,
  writeStylePreference,
  writeThemePreference,
  type ResolvedTheme,
  type StylePreference,
  type ThemePreference,
} from "./lib/theme";
import {
  ANONYMOUS_STORAGE_SCOPE,
  getStorageScope,
  normalizeSnapshot,
  readScopedCloudSyncMetadata,
  readScopedSnapshot,
  writeScopedCloudSyncMetadata,
} from "./lib/persistence";
import {
  fetchCloudSnapshotSummary,
  summarizeSnapshot,
} from "./services/cloudMigration";
import { primeThoughtEmbeddings } from "./services/embeddingRepository";
import {
  authRedirectPath,
  authRepository,
  isAuthCallbackPath,
} from "./services/authRepository";
import { DataPage } from "./pages/DataPage";
import { DistillPage } from "./pages/DistillPage";
import { InsightsPage } from "./pages/InsightsPage";
import { PersonalHome } from "./pages/PersonalHome";
import { SearchPage } from "./pages/SearchPage";
import { ThoughtDetailPage } from "./pages/ThoughtDetailPage";
import { TodayPage } from "./pages/TodayPage";
import { TopicsPage } from "./pages/TopicsPage";
import {
  createLocalQuantumXRepository,
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
  silent?: boolean;
  storageScope?: string;
};

function createSnapshotSignature(snapshot: QuantumXDataSnapshot) {
  return JSON.stringify(snapshot);
}

function snapshotHasContent(snapshot: QuantumXDataSnapshot) {
  return (
    snapshot.thoughts.length > 0 ||
    snapshot.topics.length > 0 ||
    snapshot.savedDistills.length > 0 ||
    snapshot.captureDraft.trim().length > 0
  );
}

function isSeedOnlySnapshot(snapshot: QuantumXDataSnapshot) {
  return (
    snapshot.captureDraft.trim().length === 0 &&
    snapshot.savedDistills.length === 0 &&
    createSnapshotSignature({
      thoughts: snapshot.thoughts,
      topics: snapshot.topics,
      savedDistills: [],
      captureDraft: "",
    }) === createSnapshotSignature(seedSnapshot)
  );
}

function snapshotHasUserContent(snapshot: QuantumXDataSnapshot) {
  return snapshotHasContent(snapshot) && !isSeedOnlySnapshot(snapshot);
}
const seedSnapshot: QuantumXDataSnapshot = {
  thoughts: seedThoughts,
  topics: seedTopics,
  savedDistills: [],
  captureDraft: "",
};

const emptySnapshot: QuantumXDataSnapshot = {
  thoughts: [],
  topics: [],
  savedDistills: [],
  captureDraft: "",
};

export default function App() {
  const initialStorageScope = ANONYMOUS_STORAGE_SCOPE;
  const initialSnapshot = readScopedSnapshot(initialStorageScope, seedSnapshot);
  const initialCloudSyncMetadata = readScopedCloudSyncMetadata(initialStorageScope);
  const [activeView, setActiveView] = useState<ViewKey>("today");
  const [thoughts, setThoughts] = useState<Thought[]>(() => initialSnapshot.thoughts);
  const [topics, setTopics] = useState<Topic[]>(() => initialSnapshot.topics);
  const [selectedThoughtId, setSelectedThoughtId] = useState(
    initialSnapshot.thoughts[0]?.id ?? "",
  );
  const [selectedTopicId, setSelectedTopicId] = useState(
    initialSnapshot.topics[0]?.id ?? "",
  );
  const [captureDraft, setCaptureDraft] = useState(() => initialSnapshot.captureDraft);
  const [savedDistills, setSavedDistills] = useState<SavedDistill[]>(() =>
    initialSnapshot.savedDistills,
  );
  const [authState, setAuthState] = useState<AuthState>({
    configured: false,
    session: null,
  });
  const [cloudSyncMetadata, setCloudSyncMetadata] =
    useState<CloudSyncMetadata>(initialCloudSyncMetadata);
  const [cloudMetadataScope, setCloudMetadataScope] = useState(initialStorageScope);
  const [dataMode, setDataMode] = useState<DataMode>("local");
  const [cloudSyncState, setCloudSyncState] =
    useState<CloudSyncState>("local");
  const [hydratedSessionId, setHydratedSessionId] = useState<string | null>(null);
  const [snapshotScope, setSnapshotScope] = useState(initialStorageScope);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [focusCaptureSignal, setFocusCaptureSignal] = useState(0);
  const [themePreference, setThemePreference] = useState<ThemePreference>(() =>
    readThemePreference(),
  );
  const [stylePreference, setStylePreference] = useState<StylePreference>(() =>
    readStylePreference(),
  );
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() =>
    resolveTheme(readThemePreference()),
  );
  const lastCloudSyncedSignatureRef = useRef<string | null>(null);
  const cloudSyncTimerRef = useRef<number | null>(null);
  const hasShownCloudSyncErrorRef = useRef(false);
  const handledAuthCallbackRef = useRef(false);
  const cloudBootstrapSessionRef = useRef<string | null>(null);
  const currentStorageScope = getStorageScope(authState.session?.user.id);
  const localQuantumXRepository = useMemo(
    () => createLocalQuantumXRepository(currentStorageScope),
    [currentStorageScope],
  );
  const previousStorageScopeRef = useRef(currentStorageScope);

  const selectedThought = useMemo(() => {
    return (
      thoughts.find((thought) => thought.id === selectedThoughtId) ??
      thoughts[0]
    );
  }, [selectedThoughtId, thoughts]);

  const currentSnapshot = useMemo(
    () => ({ thoughts, topics, savedDistills, captureDraft }),
    [captureDraft, savedDistills, thoughts, topics],
  );
  const isOnAuthCallback =
    typeof window !== "undefined" &&
    isAuthCallbackPath(window.location.pathname);

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
        setSelectedThoughtId((current) => (current === thought.id ? "" : current));
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
    const nextTopicIds = patch.topicIds
      ? Array.from(
          new Set(
            patch.topicIds.filter((topicId) =>
              topics.some((topic) => topic.id === topicId),
            ),
          ),
        )
      : undefined;

    setThoughts((current) =>
      current.map((thought) =>
        thought.id === thoughtId
          ? {
              ...thought,
              ...patch,
              ...(nextTopicIds ? { topicIds: nextTopicIds } : {}),
            }
          : thought,
      ),
    );

    if (nextTopicIds) {
      setTopics((current) =>
        current.map((topic) => {
          const shouldContainThought = nextTopicIds.includes(topic.id);
          const hasThought = topic.thoughtIds.includes(thoughtId);

          if (shouldContainThought === hasThought) return topic;

          return {
            ...topic,
            thoughtIds: shouldContainThought
              ? Array.from(new Set([...topic.thoughtIds, thoughtId]))
              : topic.thoughtIds.filter((id) => id !== thoughtId),
            updatedAt: new Date().toISOString(),
          };
        }),
      );
    }

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
    const normalizedSnapshot = normalizeSnapshot(snapshot);
    const useSeedFallback = options?.useSeedFallback ?? true;
    const nextThoughts =
      normalizedSnapshot.thoughts.length > 0 || !useSeedFallback
        ? normalizedSnapshot.thoughts
        : seedThoughts;
    const nextTopics =
      normalizedSnapshot.topics.length > 0 || !useSeedFallback
        ? normalizedSnapshot.topics
        : seedTopics;

    setThoughts(nextThoughts);
    setTopics(nextTopics);
    setSavedDistills(normalizedSnapshot.savedDistills);
    setCaptureDraft(normalizedSnapshot.captureDraft);
    setSnapshotScope(options?.storageScope ?? currentStorageScope);
    setSelectedThoughtId(nextThoughts[0]?.id ?? "");
    setSelectedTopicId(nextTopics[0]?.id ?? "");
    setDataMode(options?.dataMode ?? "local");
    if (options?.dataMode === "cloud") {
      lastCloudSyncedSignatureRef.current =
        createSnapshotSignature(normalizedSnapshot);
      hasShownCloudSyncErrorRef.current = false;
      setCloudSyncState("synced");
    } else {
      lastCloudSyncedSignatureRef.current = null;
      setCloudSyncState("local");
    }
    if (options?.activateDataView ?? true) {
      setActiveView("data");
    }
    if (options?.silent) {
      return;
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
    if (typeof window === "undefined") return;
    if (!isAuthCallbackPath(window.location.pathname)) return;
    if (handledAuthCallbackRef.current) return;

    const searchParams = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const authError =
      searchParams.get("error_description") ??
      searchParams.get("error") ??
      hashParams.get("error_description") ??
      hashParams.get("error");

    setActiveView("data");

    if (!authError) return;

    handledAuthCallbackRef.current = true;
    setToast({
      message: `登录没有完成：${decodeURIComponent(authError)}`,
    });
    window.history.replaceState({}, "", "/");
  }, []);

  useEffect(() => {
    if (previousStorageScopeRef.current === currentStorageScope) return;

    previousStorageScopeRef.current = currentStorageScope;
    setHydratedSessionId(null);

    const fallbackSnapshot = authState.session ? emptySnapshot : seedSnapshot;
    const scopedMetadata = readScopedCloudSyncMetadata(currentStorageScope);
    setCloudMetadataScope(currentStorageScope);
    setCloudSyncMetadata(scopedMetadata);

    void localQuantumXRepository.loadSnapshot(fallbackSnapshot).then((snapshot) => {
      importData(snapshot, {
        activateDataView: false,
        dataMode: "local",
        storageScope: currentStorageScope,
        useSeedFallback: !authState.session,
        silent: true,
      });
    });
  }, [authState.session, currentStorageScope, localQuantumXRepository]);

  useEffect(() => {
    const sessionId = authState.session?.user.id;

    if (!sessionId) {
      setDataMode("local");
      setCloudSyncState("local");
      setHydratedSessionId(null);
      lastCloudSyncedSignatureRef.current = null;
      return;
    }

    if (snapshotScope !== currentStorageScope) {
      return;
    }

    const hasPreviousCloudLink =
      Boolean(cloudSyncMetadata.lastPushedAt) ||
      Boolean(cloudSyncMetadata.lastPulledAt) ||
      Boolean(cloudSyncMetadata.lastKnownCloudSummary);

    if (hydratedSessionId === sessionId) {
      return;
    }

    if (cloudBootstrapSessionRef.current === sessionId) {
      return;
    }

    let cancelled = false;
    cloudBootstrapSessionRef.current = sessionId;

    if (hasPreviousCloudLink) {
      void supabaseQuantumXRepository
        .loadSnapshot(seedSnapshot)
        .then((snapshot) => {
          if (cancelled) return;
          importData(snapshot, {
            activateDataView: false,
            dataMode: "cloud",
            storageScope: currentStorageScope,
            toastMessage: "已自动读取当前账号的云端数据。",
            useSeedFallback: false,
          });
          setHydratedSessionId(sessionId);
          cloudBootstrapSessionRef.current = null;
        })
        .catch(() => {
          if (cancelled) return;
          setDataMode("local");
          setCloudSyncState("error");
          cloudBootstrapSessionRef.current = null;
        });
    } else {
      void fetchCloudSnapshotSummary()
        .then((summary) => {
          if (cancelled) return;

          setCloudMetadataScope(currentStorageScope);
          setCloudSyncMetadata((current) => ({
            ...current,
            lastKnownCloudSummary: summary,
          }));

          const cloudHasData =
            summary.thoughts > 0 ||
            summary.topics > 0 ||
            summary.drafts > 0 ||
            summary.hasCaptureDraft;
          const localHasData = snapshotHasUserContent(currentSnapshot);

          if (cloudHasData && !localHasData) {
            return supabaseQuantumXRepository.loadSnapshot(seedSnapshot).then((snapshot) => {
              if (cancelled) return;
              importData(snapshot, {
                activateDataView: false,
                dataMode: "cloud",
                storageScope: currentStorageScope,
                toastMessage: "当前账号在云端已有内容，已自动带到这台设备。",
                useSeedFallback: false,
              });
              setHydratedSessionId(sessionId);
              cloudBootstrapSessionRef.current = null;
            });
          }

          if (cloudHasData && localHasData) {
            setToast({
              message: "当前账号的云端已经有内容，这台设备本地也有记录。请在数据与隐私页选择同步或恢复。",
            });
          } else if (!cloudHasData) {
            setDataMode("local");
          }

          setHydratedSessionId(sessionId);
          cloudBootstrapSessionRef.current = null;
        })
        .catch(() => {
          if (cancelled) return;
          setDataMode("local");
          setCloudSyncState("error");
          cloudBootstrapSessionRef.current = null;
        });
    }

    return () => {
      cancelled = true;
      if (cloudBootstrapSessionRef.current === sessionId) {
        cloudBootstrapSessionRef.current = null;
      }
    };
  }, [
    authState.session,
    cloudSyncMetadata.lastKnownCloudSummary,
    cloudSyncMetadata.lastPulledAt,
    cloudSyncMetadata.lastPushedAt,
    currentSnapshot,
    currentStorageScope,
    hydratedSessionId,
    seedSnapshot,
    snapshotScope,
  ]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!authState.session) return;
    if (!isAuthCallbackPath(window.location.pathname)) return;
    if (handledAuthCallbackRef.current) return;

    handledAuthCallbackRef.current = true;
    setActiveView("data");
    setToast({
      message: "登录成功，已经回到 QuantumX。接下来可以继续同步或恢复数据。",
    });
    window.history.replaceState({}, "", "/");
  }, [authState.session]);

  useEffect(() => {
    if (cloudMetadataScope !== currentStorageScope) return;
    writeScopedCloudSyncMetadata(currentStorageScope, cloudSyncMetadata);
  }, [cloudMetadataScope, cloudSyncMetadata, currentStorageScope]);

  useEffect(() => {
    const sessionId = authState.session?.user.id;
    if (dataMode !== "cloud" || !sessionId || snapshotScope !== currentStorageScope) {
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
      void supabaseQuantumXRepository
        .saveSnapshot(currentSnapshot)
        .then(() => {
          lastCloudSyncedSignatureRef.current = signature;
          hasShownCloudSyncErrorRef.current = false;
          setCloudSyncState("synced");
          const summary = summarizeSnapshot(currentSnapshot);
          setCloudSyncMetadata((current) => ({
            ...current,
            lastPushedAt: new Date().toISOString(),
            lastKnownCloudSummary: summary,
          }));
          void primeThoughtEmbeddings(
            currentSnapshot.thoughts.slice(0, 12).map((thought) => thought.id),
          ).catch(() => {
            // Keep sync flow quiet when embedding warm-up fails.
          });
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
  }, [authState.session, cloudSyncState, currentSnapshot, currentStorageScope, dataMode, snapshotScope]);

  useEffect(() => {
    if (snapshotScope !== currentStorageScope) return;
    void localQuantumXRepository.saveSnapshot(currentSnapshot).then(() => {
      setCloudMetadataScope(currentStorageScope);
      setCloudSyncMetadata((current) => ({
        ...current,
        lastLocalSavedAt: new Date().toISOString(),
      }));
    });
  }, [currentSnapshot, currentStorageScope, localQuantumXRepository, snapshotScope]);

  useEffect(() => {
    if (activeView === "detail" && !selectedThought) {
      setActiveView("today");
    }
  }, [activeView, selectedThought]);

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

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const updateResolvedTheme = () => {
      setResolvedTheme(resolveTheme(themePreference));
    };

    updateResolvedTheme();

    const handleChange = () => {
      if (themePreference === "system") {
        updateResolvedTheme();
      }
    };

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    }

    mediaQuery.addListener(handleChange);
    return () => mediaQuery.removeListener(handleChange);
  }, [themePreference]);

  useEffect(() => {
    writeThemePreference(themePreference);
    writeStylePreference(stylePreference);
    document.documentElement.dataset.theme = resolvedTheme;
    document.documentElement.dataset.style = stylePreference;
    document.documentElement.style.colorScheme = resolvedTheme;
  }, [resolvedTheme, stylePreference, themePreference]);

  return (
    <div className="min-h-screen bg-transparent text-ink">
      <div className="theme-app-shell mx-auto flex min-h-screen max-w-[1520px]">
        <Sidebar
          activeView={activeView}
          onNavigate={navigate}
          onOpenData={() => navigate("data")}
          onStylePreferenceChange={setStylePreference}
          onThemePreferenceChange={setThemePreference}
          preference={themePreference}
          resolvedTheme={resolvedTheme}
          stylePreference={stylePreference}
        />
        <main className="min-w-0 flex-1 px-4 pb-24 pt-5 sm:px-6 lg:px-9 lg:pb-10">
          <div className="mb-5 flex items-center justify-between lg:hidden">
            <AccountMenu compact onOpenData={() => navigate("data")} />
            <div className="text-right">
              <div className="text-[15px] font-semibold text-ink">QuantumX</div>
              <div className="text-[11px] text-muted">个人思考沉淀工具</div>
            </div>
          </div>
          {isOnAuthCallback && !authState.session && (
            <div className="frost-panel mb-5 rounded-[22px] px-4 py-3 text-sm text-muted">
              正在完成登录回调。回调路径是{" "}
              <code className="theme-surface-soft rounded-xl px-2 py-1 text-[11px] text-ink">
                {authRedirectPath}
              </code>
              ，如果页面停在这里太久，通常说明 Supabase 或微信开放平台的回调配置还没对齐。
            </div>
          )}
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

          {activeView === "detail" && selectedThought && (
            <ThoughtDetailPage
              thought={selectedThought}
              thoughts={thoughts}
              topics={topics}
              onBack={() => setActiveView("today")}
              onAttachThoughtToTopic={attachThoughtToTopic}
              onContinueFromThought={continueFromThought}
              onGenerateFromThought={(thought) => {
                setSelectedTopicId(thought.topicIds[0] ?? topics[0]?.id ?? "");
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
      <MobileNav
        activeView={activeView}
        onNavigate={navigate}
        onStylePreferenceChange={setStylePreference}
        onThemePreferenceChange={setThemePreference}
        preference={themePreference}
        resolvedTheme={resolvedTheme}
        stylePreference={stylePreference}
      />
      {toast && (
        <div className="frost-panel-strong fixed bottom-20 left-1/2 z-30 flex w-[min(92vw,480px)] -translate-x-1/2 items-center justify-between gap-3 rounded-[24px] px-4 py-3 text-sm text-ink lg:bottom-6">
          <span>{toast.message}</span>
          {toast.actionLabel && toast.onAction && (
            <button
              className="theme-button-secondary shrink-0 rounded-xl px-3 py-1.5 text-xs font-medium transition"
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

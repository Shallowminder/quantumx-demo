import { useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Cloud,
  CloudOff,
  CloudUpload,
  Database,
  Download,
  FileUp,
  HardDrive,
  LoaderCircle,
  ShieldCheck,
} from "lucide-react";
import { formatDateTime } from "../lib/date";
import { CloudModePanel } from "../components/CloudModePanel";
import {
  createDataExport,
  getStorageSizeLabel,
  parseDataExport,
} from "../lib/persistence";
import type { AuthState } from "../services/authRepository";
import type {
  CloudSyncState,
  CloudSyncMetadata,
  QuantumXDataSnapshot,
  SavedDistill,
  Thought,
  Topic,
} from "../types";

interface DataPageProps {
  authState: AuthState;
  captureDraft: string;
  cloudSyncState: CloudSyncState;
  cloudSyncMetadata: CloudSyncMetadata;
  dataMode: "local" | "cloud";
  savedDistills: SavedDistill[];
  thoughts: Thought[];
  topics: Topic[];
  onImportData: (
    snapshot: QuantumXDataSnapshot,
    options?: {
      activateDataView?: boolean;
      toastMessage?: string;
      dataMode?: "local" | "cloud";
      useSeedFallback?: boolean;
    },
  ) => void;
  onSyncMetadataChange: (metadata: CloudSyncMetadata) => void;
}

function formatBackupDate(date = new Date()) {
  return date
    .toISOString()
    .slice(0, 16)
    .replace("T", "-")
    .replace(":", "");
}

export function DataPage({
  authState,
  captureDraft,
  cloudSyncState,
  cloudSyncMetadata,
  dataMode,
  savedDistills,
  thoughts,
  topics,
  onImportData,
  onSyncMetadataChange,
}: DataPageProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [importMessage, setImportMessage] = useState("");
  const snapshot = useMemo(
    () => ({ thoughts, topics, savedDistills, captureDraft }),
    [captureDraft, savedDistills, thoughts, topics],
  );
  const latestThought = thoughts
    .slice()
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )[0];
  const organizedCount = thoughts.filter(
    (thought) => thought.status !== "inbox",
  ).length;
  const dataSize = getStorageSizeLabel(snapshot);
  const lastCloudEventAt =
    cloudSyncMetadata.lastPushedAt ?? cloudSyncMetadata.lastPulledAt;
  const lastLocalSavedLabel = cloudSyncMetadata.lastLocalSavedAt
    ? formatDateTime(cloudSyncMetadata.lastLocalSavedAt)
    : "还没有本地保存记录";

  function renderSyncStatus() {
    if (dataMode === "local" || cloudSyncState === "local") {
      return {
        icon: CloudOff,
        tone: "border-line theme-surface-ghost text-muted",
        title: "当前是本地模式",
        detail: cloudSyncMetadata.lastLocalSavedAt
          ? `记录已保存在这个浏览器里，最近本地保存：${lastLocalSavedLabel}。登录并上传后，才会开始跟随云端。`
          : "记录会先保存在这个浏览器里。登录并上传后，才会开始跟随云端。",
      };
    }

    if (cloudSyncState === "pending") {
      return {
        icon: CloudUpload,
        tone: "theme-warning-soft",
        title: "检测到新的修改",
        detail: "这些改动会在很短时间内推到云端，暂时不用手动再点一次同步。",
      };
    }

    if (cloudSyncState === "syncing") {
      return {
        icon: LoaderCircle,
        tone: "theme-accent-soft",
        title: "正在同步到云端",
        detail: "当前浏览器里的最新修改正在写入 Supabase。",
        spinning: true,
      };
    }

    if (cloudSyncState === "error") {
      return {
        icon: AlertTriangle,
        tone: "theme-danger-soft",
        title: "最近一次同步没有完成",
        detail: "当前修改还在这个浏览器里。你可以稍后重试，或者先下载一份备份。",
      };
    }

    return {
      icon: CheckCircle2,
      tone: "theme-accent-soft",
      title: "本地与云端已对齐",
      detail: lastCloudEventAt
        ? `最近同步：${formatDateTime(lastCloudEventAt)}`
        : "当前这份数据已经和云端保持一致。",
    };
  }

  const syncStatus = renderSyncStatus();
  const SyncIcon = syncStatus.icon;

  function downloadBackup() {
    const backup = createDataExport(snapshot);
    const blob = new Blob([JSON.stringify(backup, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `quantumx-backup-${formatBackupDate()}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  async function handleFile(file: File) {
    try {
      const raw = await file.text();
      const imported = parseDataExport(raw);
      const confirmed = window.confirm(
        "导入备份会覆盖当前浏览器里的 QuantumX 本地数据。确认继续吗？",
      );
      if (!confirmed) return;
      onImportData(imported);
      setImportMessage(
        `已导入 ${imported.thoughts.length} 条记录、${imported.topics.length} 个主题和 ${imported.savedDistills.length} 份草稿。`,
      );
    } catch {
      setImportMessage("这个文件暂时无法识别。请确认它是 QuantumX 导出的 JSON 备份。");
    } finally {
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="mx-auto max-w-5xl">
      <header className="frost-panel-strong mb-8 rounded-[28px] px-6 py-7 sm:px-8">
        <div className="mb-3 flex items-center gap-2 text-sm text-muted">
          <ShieldCheck size={16} strokeWidth={1.8} />
          本地优先
        </div>
        <h1 className="text-3xl font-semibold tracking-normal text-ink sm:text-4xl">
          数据与隐私
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-muted">
          QuantumX 默认先把记录保存在这个浏览器里。配置 Supabase 并登录后，你可以在这里备份、
          迁移、恢复数据，并切换到本地优先的云端同步模式。邮箱登录已经移动到左上角头像入口里，这里主要负责同步、恢复和备份。
        </p>
        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          <span className="theme-pill inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-muted">
            <Cloud size={12} strokeWidth={1.8} />
            当前数据源：{dataMode === "cloud" ? "云端读取" : "本地读取"}
          </span>
          <span className="theme-pill rounded-full px-3 py-1.5 text-muted">
            云端登录：{authState.session ? "已连接" : authState.configured ? "未登录" : "未配置"}
          </span>
        </div>
      </header>

      <section className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="frost-panel rounded-[22px] p-4">
          <div className="mb-1 text-xs text-muted">记录</div>
          <div className="text-2xl font-semibold text-ink">{thoughts.length}</div>
        </div>
        <div className="frost-panel rounded-[22px] p-4">
          <div className="mb-1 text-xs text-muted">已整理</div>
          <div className="text-2xl font-semibold text-ink">{organizedCount}</div>
        </div>
        <div className="frost-panel rounded-[22px] p-4">
          <div className="mb-1 text-xs text-muted">主题</div>
          <div className="text-2xl font-semibold text-ink">{topics.length}</div>
        </div>
        <div className="frost-panel rounded-[22px] p-4">
          <div className="mb-1 text-xs text-muted">草稿</div>
          <div className="text-2xl font-semibold text-ink">{savedDistills.length}</div>
        </div>
      </section>

      <section
        className={`mb-6 rounded-[22px] border px-4 py-3 shadow-sm sm:px-5 ${syncStatus.tone}`}
      >
        <div className="flex items-start gap-3">
          <div className="theme-pill mt-0.5 flex h-8 w-8 items-center justify-center rounded-full">
            <SyncIcon
              className={syncStatus.spinning ? "animate-spin" : undefined}
              size={16}
              strokeWidth={1.8}
            />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-medium">{syncStatus.title}</div>
            <p className="mt-1 text-sm leading-6 text-muted">{syncStatus.detail}</p>
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section className="frost-panel-strong rounded-[26px] p-5 sm:p-6">
          <div className="mb-5 flex items-start gap-3">
            <div className="theme-icon-soft flex h-10 w-10 items-center justify-center rounded-xl">
              <Database size={19} strokeWidth={1.8} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-ink">本地数据备份</h2>
              <p className="mt-1 text-sm leading-6 text-muted">
                下载一份 JSON 文件，里面包含你的记录、主题、草稿和未提交草稿。
              </p>
            </div>
          </div>

          <div className="theme-card-soft mb-5 rounded-[22px] px-4 py-3 text-sm leading-7 text-muted">
            <div className="flex flex-wrap gap-x-5 gap-y-1">
              <span>当前大小：{dataSize}</span>
              <span>
                最近记录：
                {latestThought
                  ? new Date(latestThought.createdAt).toLocaleDateString("zh-CN")
                  : "暂无"}
              </span>
              <span>最近本地保存：{lastLocalSavedLabel}</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              className="theme-primary-button inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition"
              type="button"
              onClick={downloadBackup}
            >
              <Download size={16} strokeWidth={1.8} />
              下载备份
            </button>
            <button
              className="theme-button-secondary inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition"
              type="button"
              onClick={() => inputRef.current?.click()}
            >
              <FileUp size={16} strokeWidth={1.8} />
              从备份恢复
            </button>
            <input
              ref={inputRef}
              accept="application/json,.json"
              className="hidden"
              type="file"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void handleFile(file);
              }}
            />
          </div>

          {importMessage && (
            <div className="theme-accent-soft mt-4 rounded-lg px-4 py-3 text-sm leading-6">
              {importMessage}
            </div>
          )}
        </section>

        <aside className="space-y-4">
          <CloudModePanel
            authEntry="avatar"
            dataMode={dataMode}
            snapshot={snapshot}
            onImportCloudSnapshot={onImportData}
            syncMetadata={cloudSyncMetadata}
            onSyncMetadataChange={onSyncMetadataChange}
          />

          <div className="frost-panel rounded-[26px] p-5">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink">
              <HardDrive size={16} strokeWidth={1.8} />
              当前保存方式
            </div>
            <p className="text-sm leading-7 text-muted">
              未登录或未切换到云端模式时，数据只存在当前浏览器的 localStorage。登录并同步后，QuantumX 会继续先写本地，再把整份 snapshot upsert 到 Supabase。
            </p>
          </div>

          <div className="frost-panel rounded-[26px] p-5">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink">
              <CheckCircle2 size={16} strokeWidth={1.8} />
              下一步增强
            </div>
            <div className="space-y-3 text-sm leading-6 text-muted">
              <p>1. 增加导入前预览，避免误覆盖当前浏览器数据。</p>
              <p>2. 明确区分“上传更新”和“完整替换”，减少同步误解。</p>
              <p>3. 补齐账号删除、数据清除和隐私说明。</p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

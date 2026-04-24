import { useMemo, useRef, useState } from "react";
import {
  CheckCircle2,
  Database,
  Download,
  FileUp,
  HardDrive,
  ShieldCheck,
} from "lucide-react";
import { CloudModePanel } from "../components/CloudModePanel";
import {
  createDataExport,
  getStorageSizeLabel,
  parseDataExport,
} from "../lib/persistence";
import type { QuantumXDataSnapshot, SavedDistill, Thought, Topic } from "../types";

interface DataPageProps {
  captureDraft: string;
  savedDistills: SavedDistill[];
  thoughts: Thought[];
  topics: Topic[];
  onImportData: (snapshot: QuantumXDataSnapshot) => void;
}

function formatBackupDate(date = new Date()) {
  return date
    .toISOString()
    .slice(0, 16)
    .replace("T", "-")
    .replace(":", "");
}

export function DataPage({
  captureDraft,
  savedDistills,
  thoughts,
  topics,
  onImportData,
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
      <header className="mb-8 rounded-[1.35rem] bg-white/60 px-6 py-7 shadow-sm sm:px-8">
        <div className="mb-3 flex items-center gap-2 text-sm text-muted">
          <ShieldCheck size={16} strokeWidth={1.8} />
          本地优先
        </div>
        <h1 className="text-3xl font-semibold tracking-normal text-ink sm:text-4xl">
          数据与隐私
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-muted">
          QuantumX 当前把记录保存在这个浏览器里。正式云同步上线前，你可以在这里备份、
          迁移和恢复自己的思考数据。
        </p>
      </header>

      <section className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl bg-white/75 p-4 shadow-sm">
          <div className="mb-1 text-xs text-muted">记录</div>
          <div className="text-2xl font-semibold text-ink">{thoughts.length}</div>
        </div>
        <div className="rounded-xl bg-white/75 p-4 shadow-sm">
          <div className="mb-1 text-xs text-muted">已整理</div>
          <div className="text-2xl font-semibold text-ink">{organizedCount}</div>
        </div>
        <div className="rounded-xl bg-white/75 p-4 shadow-sm">
          <div className="mb-1 text-xs text-muted">主题</div>
          <div className="text-2xl font-semibold text-ink">{topics.length}</div>
        </div>
        <div className="rounded-xl bg-white/75 p-4 shadow-sm">
          <div className="mb-1 text-xs text-muted">草稿</div>
          <div className="text-2xl font-semibold text-ink">{savedDistills.length}</div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section className="rounded-[1.25rem] bg-white p-5 shadow-soft sm:p-6">
          <div className="mb-5 flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sage/10 text-sage">
              <Database size={19} strokeWidth={1.8} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-ink">本地数据备份</h2>
              <p className="mt-1 text-sm leading-6 text-muted">
                下载一份 JSON 文件，里面包含你的记录、主题、草稿和未提交草稿。
              </p>
            </div>
          </div>

          <div className="mb-5 rounded-xl bg-canvas px-4 py-3 text-sm leading-7 text-muted">
            <div className="flex flex-wrap gap-x-5 gap-y-1">
              <span>当前大小：{dataSize}</span>
              <span>
                最近记录：
                {latestThought
                  ? new Date(latestThought.createdAt).toLocaleDateString("zh-CN")
                  : "暂无"}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              className="inline-flex items-center gap-2 rounded-md bg-ink px-4 py-2 text-sm font-medium text-white transition hover:bg-black"
              type="button"
              onClick={downloadBackup}
            >
              <Download size={16} strokeWidth={1.8} />
              下载备份
            </button>
            <button
              className="inline-flex items-center gap-2 rounded-md border border-line bg-canvas px-4 py-2 text-sm font-medium text-ink transition hover:border-sage/40 hover:bg-white"
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
            <div className="mt-4 rounded-lg border border-sage/20 bg-sage/10 px-4 py-3 text-sm leading-6 text-ink">
              {importMessage}
            </div>
          )}
        </section>

        <aside className="space-y-4">
          <CloudModePanel snapshot={snapshot} />

          <div className="rounded-[1.25rem] bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink">
              <HardDrive size={16} strokeWidth={1.8} />
              当前保存方式
            </div>
            <p className="text-sm leading-7 text-muted">
              数据只存在当前浏览器的 localStorage。换设备不会自动同步，清理浏览器数据会删除记录。
            </p>
          </div>

          <div className="rounded-[1.25rem] bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink">
              <CheckCircle2 size={16} strokeWidth={1.8} />
              下一步落地
            </div>
            <div className="space-y-3 text-sm leading-6 text-muted">
              <p>1. 接入账号和云数据库，让记录跟随用户。</p>
              <p>2. 用向量检索做真实相关旧想法召回。</p>
              <p>3. 保存每次 AI 蒸馏的来源和用户反馈。</p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Cloud,
  Download,
  CloudUpload,
  RefreshCcw,
  LogOut,
  Mail,
  ShieldCheck,
} from "lucide-react";
import type { Session } from "@supabase/supabase-js";
import { formatDateTime, formatDayLabel } from "../lib/date";
import { authRepository } from "../services/authRepository";
import {
  fetchCloudSnapshotSummary,
  migrateLocalSnapshotToSupabase,
  restoreSnapshotFromSupabase,
  summarizeSnapshot,
} from "../services/cloudMigration";
import type {
  CloudSyncMetadata,
  QuantumXDataSnapshot,
  SnapshotSummary,
} from "../types";

interface CloudModePanelProps {
  snapshot: QuantumXDataSnapshot;
  onImportCloudSnapshot: (
    snapshot: QuantumXDataSnapshot,
    options?: {
      activateDataView?: boolean;
      toastMessage?: string;
      dataMode?: "local" | "cloud";
    },
  ) => void;
  syncMetadata: CloudSyncMetadata;
  onSyncMetadataChange: (metadata: CloudSyncMetadata) => void;
}

export function CloudModePanel({
  snapshot,
  onImportCloudSnapshot,
  syncMetadata,
  onSyncMetadataChange,
}: CloudModePanelProps) {
  const [configured, setConfigured] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [cloudSummary, setCloudSummary] = useState<SnapshotSummary | null>(null);
  const localSummary = summarizeSnapshot(snapshot);
  const effectiveCloudSummary = cloudSummary ?? syncMetadata.lastKnownCloudSummary ?? null;

  useEffect(() => {
    let mounted = true;

    void authRepository
      .getState()
      .then((state) => {
        if (!mounted) return;
        setConfigured(state.configured);
        setSession(state.session);
      })
      .catch(() => {
        if (!mounted) return;
        setConfigured(false);
        setSession(null);
      });

    const unsubscribe = authRepository.onAuthChange((nextSession) => {
      setSession(nextSession);
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!configured || !session) return;

    let cancelled = false;
    void fetchCloudSnapshotSummary()
      .then((summary) => {
        if (cancelled) return;
        setCloudSummary(summary);
      })
      .catch(() => {
        if (cancelled) return;
        setCloudSummary(null);
      });

    return () => {
      cancelled = true;
    };
  }, [configured, session]);

  function updateSyncMetadata(next: Partial<CloudSyncMetadata>) {
    onSyncMetadataChange({ ...syncMetadata, ...next });
  }

  function suggestionForSync() {
    if (!effectiveCloudSummary) {
      return "还没有读取到云端摘要。第一次使用时，建议先把当前本地数据上传到云端。";
    }

    const localLatest = localSummary.latestActivityAt
      ? new Date(localSummary.latestActivityAt).getTime()
      : 0;
    const cloudLatest = effectiveCloudSummary.latestActivityAt
      ? new Date(effectiveCloudSummary.latestActivityAt).getTime()
      : 0;
    const localVolume =
      localSummary.thoughts + localSummary.topics + localSummary.drafts;
    const cloudVolume =
      effectiveCloudSummary.thoughts +
      effectiveCloudSummary.topics +
      effectiveCloudSummary.drafts;

    if (localLatest > cloudLatest + 60_000) {
      return "本地更新较新，建议先上传到云端，再决定是否需要从云端恢复。";
    }

    if (cloudLatest > localLatest + 60_000) {
      return "云端更新较新。如果当前浏览器不是最新设备，建议先备份本地，再从云端恢复。";
    }

    if (cloudVolume > localVolume) {
      return "云端数据看起来更完整。如果你最近在别的设备上用过 QuantumX，可以先恢复再继续。";
    }

    if (localVolume > cloudVolume) {
      return "本地数据更多，建议先上传，让云端跟上当前这台设备的状态。";
    }

    return "本地和云端状态比较接近。刷新一次云端摘要后，再决定上传还是恢复会更稳。";
  }

  function confirmSyncToCloud() {
    const cloudText = effectiveCloudSummary
      ? `${effectiveCloudSummary.thoughts} 条记录、${effectiveCloudSummary.topics} 个主题、${effectiveCloudSummary.drafts} 份草稿`
      : "暂无云端摘要";

    return window.confirm(
      `准备把本地数据上传到云端。\n\n本地：${localSummary.thoughts} 条记录、${localSummary.topics} 个主题、${localSummary.drafts} 份草稿\n云端：${cloudText}\n\n已存在的同 client_id 数据会被更新。确认继续吗？`,
    );
  }

  function confirmRestoreFromCloud() {
    const cloudText = effectiveCloudSummary
      ? `${effectiveCloudSummary.thoughts} 条记录、${effectiveCloudSummary.topics} 个主题、${effectiveCloudSummary.drafts} 份草稿`
      : "暂无云端摘要";

    return window.confirm(
      `准备从云端恢复数据到当前浏览器。\n\n本地：${localSummary.thoughts} 条记录、${localSummary.topics} 个主题、${localSummary.drafts} 份草稿\n云端：${cloudText}\n\n这会覆盖当前浏览器里的本地数据。建议先下载备份。确认继续吗？`,
    );
  }

  async function sendMagicLink() {
    const cleanEmail = email.trim();
    if (!cleanEmail) return;

    setBusy(true);
    setMessage("");
    try {
      await authRepository.sendMagicLink(cleanEmail);
      setMessage("登录链接已发送，请去邮箱确认。");
    } catch {
      setMessage("暂时无法发送登录链接，请检查 Supabase 配置和邮箱设置。");
    } finally {
      setBusy(false);
    }
  }

  async function syncToCloud() {
    if (!confirmSyncToCloud()) return;

    setBusy(true);
    setMessage("");
    try {
      const result = await migrateLocalSnapshotToSupabase(snapshot);
      setCloudSummary(result.summary);
      updateSyncMetadata({
        lastPushedAt: new Date().toISOString(),
        lastKnownCloudSummary: result.summary,
      });
      setMessage(
        `已同步 ${result.thoughts} 条记录、${result.topics} 个主题、${result.drafts} 份草稿和 ${result.links} 个主题关系。`,
      );
    } catch {
      setMessage("同步失败。请确认 Supabase schema 已执行，且当前账号有写入权限。");
    } finally {
      setBusy(false);
    }
  }

  async function restoreFromCloud() {
    if (!confirmRestoreFromCloud()) return;

    setBusy(true);
    setMessage("");
    try {
      const result = await restoreSnapshotFromSupabase();
      onImportCloudSnapshot(result.snapshot, {
        activateDataView: false,
        dataMode: "cloud",
        toastMessage: "已从云端恢复当前账号的数据。",
      });
      setCloudSummary(result.summary);
      updateSyncMetadata({
        lastPulledAt: new Date().toISOString(),
        lastKnownCloudSummary: result.summary,
      });
      setMessage(
        `已从云端恢复 ${result.thoughts} 条记录、${result.topics} 个主题和 ${result.drafts} 份草稿。`,
      );
    } catch {
      setMessage("恢复失败。请确认 Supabase 已有数据，且当前账号有读取权限。");
    } finally {
      setBusy(false);
    }
  }

  async function refreshCloudSummary() {
    if (!session) return;
    setBusy(true);
    try {
      const summary = await fetchCloudSnapshotSummary();
      setCloudSummary(summary);
      updateSyncMetadata({ lastKnownCloudSummary: summary });
      setMessage("已刷新云端摘要。");
    } catch {
      setMessage("暂时无法读取云端摘要，请稍后再试。");
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    setBusy(true);
    try {
      await authRepository.signOut();
      setMessage("已退出云端会话。");
    } catch {
      setMessage("退出时遇到问题，请稍后再试。");
    } finally {
      setBusy(false);
    }
  }

  if (!configured) {
    return (
      <section className="rounded-[1.25rem] bg-white p-5 shadow-sm">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink">
          <Cloud size={16} strokeWidth={1.8} />
          云同步准备
        </div>
        <p className="text-sm leading-7 text-muted">
          当前仍是本地模式。填入 Supabase 环境变量后，这里会出现邮箱登录入口，
          后续就可以把记录同步到云端。
        </p>
        <div className="mt-4 rounded-lg bg-canvas px-3 py-2 font-mono text-xs leading-6 text-muted">
          VITE_SUPABASE_URL
          <br />
          VITE_SUPABASE_ANON_KEY
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-[1.25rem] bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink">
        <ShieldCheck size={16} strokeWidth={1.8} />
        云端身份
      </div>

      {session ? (
        <div>
          <div className="mb-3 rounded-lg bg-sage/10 px-3 py-2 text-sm leading-6 text-ink">
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 size={15} strokeWidth={1.8} />
              已登录：{session.user.email ?? "当前用户"}
            </span>
          </div>
          <p className="mb-4 text-sm leading-7 text-muted">
            账号会话已准备好。你可以把当前浏览器里的本地数据同步到 Supabase。
          </p>
          <div className="mb-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg bg-canvas px-3 py-3 text-sm leading-6 text-muted">
              <div className="mb-1 text-xs text-muted">本地</div>
              <div className="font-medium text-ink">
                {localSummary.thoughts} 条记录 · {localSummary.topics} 个主题 · {localSummary.drafts} 份草稿
              </div>
              <div className="mt-1 text-xs">
                {localSummary.latestActivityAt
                  ? `最近活动：${formatDayLabel(localSummary.latestActivityAt)}`
                  : "还没有本地活动"}
              </div>
            </div>
            <div className="rounded-lg bg-canvas px-3 py-3 text-sm leading-6 text-muted">
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="text-xs text-muted">云端</span>
                <button
                  className="inline-flex items-center gap-1 text-[11px] text-muted transition hover:text-ink disabled:opacity-60"
                  disabled={busy}
                  type="button"
                  onClick={() => void refreshCloudSummary()}
                >
                  <RefreshCcw size={11} strokeWidth={1.8} />
                  刷新
                </button>
              </div>
              <div className="font-medium text-ink">
                {effectiveCloudSummary
                  ? `${effectiveCloudSummary.thoughts} 条记录 · ${effectiveCloudSummary.topics} 个主题 · ${effectiveCloudSummary.drafts} 份草稿`
                  : "还没有读取云端摘要"}
              </div>
              <div className="mt-1 text-xs">
                {effectiveCloudSummary?.latestActivityAt
                  ? `最近活动：${formatDayLabel(effectiveCloudSummary.latestActivityAt)}`
                  : "还没有云端活动"}
              </div>
            </div>
          </div>
          <div className="mb-4 rounded-lg border border-line bg-white px-3 py-3 text-xs leading-6 text-muted">
            <div>
              最近上传：
              {syncMetadata.lastPushedAt
                ? formatDayLabel(syncMetadata.lastPushedAt)
                : "还没有上传到云端"}
            </div>
            <div>
              最近恢复：
              {syncMetadata.lastPulledAt
                ? formatDayLabel(syncMetadata.lastPulledAt)
                : "还没有从云端恢复"}
            </div>
          </div>
          <div className="mb-4 rounded-lg border border-amber/25 bg-amber/10 px-3 py-3 text-sm leading-6 text-ink">
            <div className="mb-1 flex items-center gap-2 font-medium">
              <AlertTriangle size={15} strokeWidth={1.8} />
              同步建议
            </div>
            <p>{suggestionForSync()}</p>
            {effectiveCloudSummary?.latestActivityAt && (
              <p className="mt-2 text-xs text-muted">
                最近一次云端活动：{formatDateTime(effectiveCloudSummary.latestActivityAt)}
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              className="inline-flex items-center gap-2 rounded-md bg-ink px-3 py-2 text-sm font-medium text-white transition hover:bg-black disabled:bg-stone-200 disabled:text-muted"
              disabled={busy}
              type="button"
              onClick={() => void syncToCloud()}
            >
              <CloudUpload size={15} strokeWidth={1.8} />
              同步到云端
            </button>
            <button
              className="inline-flex items-center gap-2 rounded-md border border-line bg-canvas px-3 py-2 text-sm text-ink transition hover:bg-white disabled:opacity-60"
              disabled={busy}
              type="button"
              onClick={() => void restoreFromCloud()}
            >
              <Download size={15} strokeWidth={1.8} />
              从云端恢复
            </button>
            <button
              className="inline-flex items-center gap-2 rounded-md border border-line bg-canvas px-3 py-2 text-sm text-ink transition hover:bg-white disabled:opacity-60"
              disabled={busy}
              type="button"
              onClick={() => void signOut()}
            >
              <LogOut size={15} strokeWidth={1.8} />
              退出登录
            </button>
          </div>
        </div>
      ) : (
        <div>
          <p className="mb-4 text-sm leading-7 text-muted">
            使用邮箱登录后，QuantumX 就可以把本地数据和云端用户绑定。
            当前版本先完成身份入口，数据同步会在下一步接上。
          </p>
          <div className="flex gap-2">
            <label className="relative min-w-0 flex-1">
              <Mail
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
                size={15}
                strokeWidth={1.8}
              />
              <input
                className="w-full rounded-md border border-line bg-canvas py-2 pl-9 pr-3 text-sm text-ink outline-none transition focus:border-sage/45 focus:bg-white"
                placeholder="邮箱地址"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </label>
            <button
              className="rounded-md bg-ink px-3 py-2 text-sm font-medium text-white transition hover:bg-black disabled:bg-stone-200 disabled:text-muted"
              disabled={busy || email.trim().length === 0}
              type="button"
              onClick={() => void sendMagicLink()}
            >
              发送
            </button>
          </div>
        </div>
      )}

      {message && (
        <div className="mt-4 rounded-lg border border-line bg-canvas px-3 py-2 text-sm leading-6 text-muted">
          {message}
        </div>
      )}
    </section>
  );
}

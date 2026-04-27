import { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Cloud,
  Download,
  CloudUpload,
  RefreshCcw,
  LogOut,
  Mail,
  MessageCircleMore,
  QrCode,
  ShieldCheck,
} from "lucide-react";
import type { Session } from "@supabase/supabase-js";
import { formatDateTime, formatDayLabel } from "../lib/date";
import {
  authRedirectPath,
  authRepository,
  getAuthRedirectUrl,
  isWeChatConfigured,
  weChatProviderId,
} from "../services/authRepository";
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
  authEntry?: "inline" | "avatar";
  dataMode: "local" | "cloud";
  snapshot: QuantumXDataSnapshot;
  onImportCloudSnapshot: (
    snapshot: QuantumXDataSnapshot,
    options?: {
      activateDataView?: boolean;
      toastMessage?: string;
      dataMode?: "local" | "cloud";
      useSeedFallback?: boolean;
    },
  ) => void;
  syncMetadata: CloudSyncMetadata;
  onSyncMetadataChange: (metadata: CloudSyncMetadata) => void;
}

export function CloudModePanel({
  authEntry = "inline",
  dataMode,
  snapshot,
  onImportCloudSnapshot,
  syncMetadata,
  onSyncMetadataChange,
}: CloudModePanelProps) {
  const qrContainerId = useId().replace(/:/g, "-");
  const [configured, setConfigured] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [cloudSummary, setCloudSummary] = useState<SnapshotSummary | null>(null);
  const [wechatQrUrl, setWeChatQrUrl] = useState("");
  const [wechatQrState, setWeChatQrState] = useState<"idle" | "loading" | "ready" | "error">(
    "idle",
  );
  const qrScriptRequestedRef = useRef(false);
  const localSummary = summarizeSnapshot(snapshot);
  const effectiveCloudSummary = cloudSummary ?? syncMetadata.lastKnownCloudSummary ?? null;
  const callbackUrl = getAuthRedirectUrl();
  const weChatQrParams = useMemo(() => {
    if (!wechatQrUrl) return null;

    try {
      const parsed = new URL(wechatQrUrl);
      const hostOk = parsed.hostname.includes("weixin.qq.com");
      const pathOk = parsed.pathname.includes("qrconnect");
      const appid = parsed.searchParams.get("appid");
      const redirectUri = parsed.searchParams.get("redirect_uri");
      const state = parsed.searchParams.get("state") ?? "";
      const scope = parsed.searchParams.get("scope") ?? "snsapi_login";

      if (!hostOk || !pathOk || !appid || !redirectUri) return null;

      return {
        appid,
        redirectUri,
        scope,
        state,
      };
    } catch {
      return null;
    }
  }, [wechatQrUrl]);

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

  async function copyCallbackUrl() {
    try {
      await navigator.clipboard.writeText(callbackUrl);
      setMessage("回调地址已复制，可以直接贴到 Supabase 或微信开放平台里。");
    } catch {
      setMessage("复制失败了，不过你可以直接手动复制下面这条回调地址。");
    }
  }

  useEffect(() => {
    if (!weChatQrParams) return;
    if (typeof window === "undefined") return;

    let cancelled = false;

    async function ensureScript() {
      if (window.WxLogin) return;
      if (qrScriptRequestedRef.current) {
        await new Promise<void>((resolve, reject) => {
          const startedAt = Date.now();
          const poll = window.setInterval(() => {
            if (window.WxLogin) {
              window.clearInterval(poll);
              resolve();
              return;
            }
            if (Date.now() - startedAt > 8000) {
              window.clearInterval(poll);
              reject(new Error("WeChat QR script timeout"));
            }
          }, 120);
        });
        return;
      }

      qrScriptRequestedRef.current = true;
      await new Promise<void>((resolve, reject) => {
        const script = document.createElement("script");
        script.src = "https://res.wx.qq.com/connect/zh_CN/htmledition/js/wxLogin.js";
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error("WeChat QR script load failed"));
        document.head.appendChild(script);
      });
    }

    void ensureScript()
      .then(() => {
        if (cancelled || !window.WxLogin) return;
        const container = document.getElementById(qrContainerId);
        if (!container) return;
        container.innerHTML = "";
        new window.WxLogin({
          id: qrContainerId,
          appid: weChatQrParams.appid,
          scope: weChatQrParams.scope,
          redirect_uri: weChatQrParams.redirectUri,
          state: weChatQrParams.state,
          style: "black",
          self_redirect: false,
          href:
            "data:text/css;base64,LmltcG93ZXJCb3ggLmluZm8sLmltcG93ZXJCb3ggLnRpdGxle2Rpc3BsYXk6bm9uZX0uaW1wb3dlckJveCAucXJjb2Rle3dpZHRoOjEwMCU7bWFyZ2luOjA7Ym9yZGVyOjA7Ym9yZGVyLXJhZGl1czoxNHB4O292ZXJmbG93OmhpZGRlbn0=",
        });
      })
      .catch(() => {
        if (cancelled) return;
        setWeChatQrState("error");
      });

    return () => {
      cancelled = true;
    };
  }, [qrContainerId, weChatQrParams]);

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

  async function signInWithWeChat() {
    setBusy(true);
    setMessage("");
    try {
      await authRepository.signInWithWeChat();
    } catch {
      setMessage(
        "微信登录暂时还没配置好。请先在 Supabase 的 Custom OAuth Providers 里创建微信 provider，再回到这里重试。",
      );
    } finally {
      setBusy(false);
    }
  }

  async function prepareWeChatQr() {
    setBusy(true);
    setMessage("");
    setWeChatQrState("loading");
    try {
      const url = await authRepository.getWeChatOAuthUrl();
      setWeChatQrUrl(url);
      setWeChatQrState("ready");
    } catch {
      setWeChatQrState("error");
      setMessage(
        "暂时拿不到微信扫码登录地址。请确认 Supabase 自定义 provider 和回调地址已经配置完成。",
      );
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
      onImportCloudSnapshot(snapshot, {
        activateDataView: false,
        dataMode: "cloud",
        toastMessage: "已切换到云端模式，后续修改会自动同步。",
      });
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
        useSeedFallback: false,
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

  function renderEmailLogin(disabled: boolean, note: string) {
    return (
      <>
        <div className="flex gap-2">
          <label className="relative min-w-0 flex-1">
            <Mail
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
              size={15}
              strokeWidth={1.8}
            />
            <input
              className="theme-input w-full rounded-[18px] py-2.5 pl-9 pr-3 text-sm text-ink outline-none transition disabled:cursor-not-allowed disabled:opacity-60"
              disabled={disabled}
              placeholder="邮箱地址"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>
          <button
            className="theme-primary-button rounded-xl px-3.5 py-2.5 text-sm font-medium transition disabled:text-muted"
            disabled={disabled || busy || email.trim().length === 0}
            type="button"
            onClick={() => void sendMagicLink()}
          >
            发送登录链接
          </button>
        </div>
        <p className="mt-3 text-xs leading-6 text-muted">{note}</p>
      </>
    );
  }

  function renderPostLoginGuide() {
    if (!session || dataMode === "cloud") return null;

    const localCount =
      localSummary.thoughts + localSummary.topics + localSummary.drafts;
    const cloudCount = effectiveCloudSummary
      ? effectiveCloudSummary.thoughts +
        effectiveCloudSummary.topics +
        effectiveCloudSummary.drafts
      : 0;

    const title =
      localCount > 0 && cloudCount > 0
        ? "你已经连上云端了，先决定这台设备要跟哪一边对齐。"
        : localCount > 0
          ? "你已经连上云端了，可以先把这台设备里的内容同步上去。"
          : cloudCount > 0
            ? "你已经连上云端了，可以先把已有云端内容恢复到这台设备。"
            : "你已经连上云端了，接下来可以先选一个方向开始。";

    const detail =
      localCount > 0 && cloudCount > 0
        ? "如果这台设备上的内容是最新的，就先同步到云端；如果你之前在别的设备上已经整理过内容，就先从云端恢复。"
        : localCount > 0
          ? "这样这台设备里的记录、主题和草稿会成为你的第一份云端副本。"
          : cloudCount > 0
            ? "这样你会把已经保存到云端的记录和草稿带回这台设备。"
            : "当前本地和云端都还比较空，你可以先记录一点内容，再决定是否需要同步。";

    return (
      <div className="mb-4 rounded-[22px] border border-sage/15 bg-sage/10 px-4 py-4 text-sm text-ink">
        <div className="mb-1 flex items-center gap-2 font-medium">
          <CheckCircle2 size={15} strokeWidth={1.8} />
          登录成功，下一步这样做会更顺
        </div>
        <p className="leading-6">{title}</p>
        <p className="mt-2 text-xs leading-6 text-muted">{detail}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            className="theme-primary-button inline-flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-medium transition disabled:text-muted"
            disabled={busy}
            type="button"
            onClick={() => void syncToCloud()}
          >
            <CloudUpload size={15} strokeWidth={1.8} />
            把这台设备同步到云端
          </button>
          <button
            className="theme-button-muted inline-flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm transition disabled:opacity-60"
            disabled={busy}
            type="button"
            onClick={() => void restoreFromCloud()}
          >
            <Download size={15} strokeWidth={1.8} />
            从云端恢复到这台设备
          </button>
        </div>
      </div>
    );
  }

  if (!configured) {
    if (authEntry === "avatar") {
      return (
        <section className="frost-panel rounded-[26px] p-5">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink">
            <ShieldCheck size={16} strokeWidth={1.8} />
            云端身份
          </div>
          <p className="text-sm leading-7 text-muted">
            当前部署还没有把云端登录完整接起来。等 Supabase 环境变量配置完成后，左上角头像入口会直接提供邮箱登录；这里继续负责同步、恢复和备份说明。
          </p>
        </section>
      );
    }

    return (
      <section className="frost-panel rounded-[26px] p-5">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink">
          <ShieldCheck size={16} strokeWidth={1.8} />
          邮箱登录
        </div>
        <p className="text-sm leading-7 text-muted">
入口就在这里。当前部署如果还没有配置 Supabase 环境变量，发送按钮会暂时不可用；
配好后，邮箱登录会直接接入本地优先的云端同步链路。
        </p>
        <div className="theme-card-soft mt-4 rounded-[22px] p-4">
          {renderEmailLogin(
            true,
            "输入邮箱后本应发送一封 magic link 登录邮件。现在你在网站里看不到可用状态，不是你没找到入口，而是这台部署环境还没配置云端登录。",
          )}
        </div>
        <div className="theme-card-soft mt-4 rounded-[18px] px-3 py-2 font-mono text-xs leading-6 text-muted">
          VITE_SUPABASE_URL
          <br />
          VITE_SUPABASE_ANON_KEY
        </div>
        <p className="mt-3 text-xs leading-6 text-muted">
          等这两个环境变量在 Vercel 里配好后，邮箱登录和云端数据恢复就会立即可用。微信登录可以后续再接。
        </p>
      </section>
    );
  }

  return (
    <section className="frost-panel rounded-[26px] p-5">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink">
        <ShieldCheck size={16} strokeWidth={1.8} />
        云端身份
      </div>

      {session ? (
        <div>
          <div className="mb-3 rounded-[18px] bg-sage/10 px-3 py-2.5 text-sm leading-6 text-ink">
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 size={15} strokeWidth={1.8} />
              已登录：{session.user.email ?? "当前用户"}
            </span>
          </div>
          {renderPostLoginGuide()}
          <p className="mb-4 text-sm leading-7 text-muted">
            账号会话已准备好。
            {dataMode === "cloud"
              ? " 当前正在使用云端模式，后续修改会自动同步到 Supabase。"
              : " 你可以先把当前浏览器里的本地数据同步到 Supabase，再切换到云端模式。"}
          </p>
          <div className="mb-4 grid gap-3 sm:grid-cols-2">
            <div className="theme-card-soft rounded-[20px] px-3.5 py-3.5 text-sm leading-6 text-muted">
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
            <div className="theme-card-soft rounded-[20px] px-3.5 py-3.5 text-sm leading-6 text-muted">
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
          <div className="theme-card-overlay mb-4 rounded-[18px] px-3.5 py-3 text-xs leading-6 text-muted">
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
          <div className="mb-4 rounded-[20px] border border-amber/20 bg-amber/10 px-3.5 py-3.5 text-sm leading-6 text-ink">
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
              className="theme-primary-button inline-flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-medium transition disabled:text-muted"
              disabled={busy}
              type="button"
              onClick={() => void syncToCloud()}
            >
              <CloudUpload size={15} strokeWidth={1.8} />
              同步到云端
            </button>
            <button
              className="theme-button-secondary inline-flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm transition disabled:opacity-60"
              disabled={busy}
              type="button"
              onClick={() => void restoreFromCloud()}
            >
              <Download size={15} strokeWidth={1.8} />
              从云端恢复
            </button>
            <button
              className="theme-button-muted inline-flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm transition disabled:opacity-60"
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
          {authEntry === "avatar" ? (
            <div>
              <p className="mb-4 text-sm leading-7 text-muted">
                邮箱登录已经移到左上角头像入口里。先从那里连上你的账号，这里就会自动切换成同步、恢复和云端状态管理。
              </p>
              <div className="theme-card-soft mt-3 rounded-[20px] px-3.5 py-3 text-xs leading-6 text-muted">
                <div className="font-medium text-ink">当前登录回调地址</div>
                <div className="theme-card-overlay mt-2 break-all rounded-[14px] px-2.5 py-2 font-mono text-[11px] text-ink">
                  {callbackUrl}
                </div>
                <div className="mt-2">
                  如果之后要继续调整回调路径，当前值是
                  <code className="theme-pill ml-1 rounded px-1 py-0.5 text-[11px] text-ink">
                    {authRedirectPath}
                  </code>
                  。
                </div>
              </div>
            </div>
          ) : (
            <div>
              <p className="mb-4 text-sm leading-7 text-muted">
                先用邮箱登录最省心。输入邮箱后，QuantumX 会发一封登录邮件给你；
                点开邮件里的链接，就能把这台设备和你的云端账号连起来。
              </p>
              <div className="theme-card-soft rounded-[22px] p-4">
                {renderEmailLogin(
                  false,
                  "发送后请去邮箱里点开登录链接。如果没收到，可以稍等几十秒，或者检查垃圾邮件。",
                )}
              </div>
              <div className="theme-card-soft mt-3 rounded-[20px] px-3.5 py-3 text-xs leading-6 text-muted">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium text-ink">当前登录回调地址</span>
                  <button
                    className="theme-button-muted rounded-lg px-2.5 py-1 text-[11px] transition"
                    type="button"
                    onClick={() => void copyCallbackUrl()}
                  >
                    复制
                  </button>
                </div>
                <div className="theme-card-overlay mt-2 break-all rounded-[14px] px-2.5 py-2 font-mono text-[11px] text-ink">
                  {callbackUrl}
                </div>
                <div className="mt-2">
                  你可以在环境变量里调整回调路径：
                  <code className="theme-pill mx-1 rounded px-1 py-0.5 text-[11px] text-ink">
                    VITE_SUPABASE_AUTH_REDIRECT_PATH
                  </code>
                  当前值是
                  <code className="theme-pill ml-1 rounded px-1 py-0.5 text-[11px] text-ink">
                    {authRedirectPath}
                  </code>
                  。
                </div>
              </div>
              {isWeChatConfigured && (
                <div className="theme-card-soft mt-4 rounded-[22px] p-4">
                  <div className="mb-2 text-sm font-medium text-ink">其他登录方式（可选）</div>
                  <p className="mb-3 text-xs leading-6 text-muted">
                    微信登录还可以保留在这里，但我们现在主推邮箱登录。只有在你已经把微信 provider 配好时，这部分才会显示。
                  </p>
                  <div className="mb-3 flex flex-wrap gap-2">
                    <button
                      className="theme-button-muted inline-flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm transition disabled:opacity-60"
                      disabled={busy}
                      type="button"
                      onClick={() => void signInWithWeChat()}
                    >
                      <MessageCircleMore size={15} strokeWidth={1.8} />
                      微信登录
                    </button>
                    <button
                      className="theme-button-muted inline-flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm transition disabled:opacity-60"
                      disabled={busy}
                      type="button"
                      onClick={() => void prepareWeChatQr()}
                    >
                      <QrCode size={15} strokeWidth={1.8} />
                      二维码登录
                    </button>
                    <span className="theme-pill inline-flex items-center rounded-xl px-3 py-2 text-xs text-muted">
                      当前 provider：{weChatProviderId}
                    </span>
                  </div>
                  <div
                    className="theme-card-overlay mx-auto flex min-h-[240px] max-w-[240px] items-center justify-center rounded-[20px] p-3"
                    id={qrContainerId}
                  >
                    {wechatQrState === "idle" && (
                      <div className="px-4 text-center text-xs leading-6 text-muted">
                        点击上面的「二维码登录」后，这里会生成可扫码的登录二维码。
                      </div>
                    )}
                    {wechatQrState === "loading" && (
                      <div className="px-4 text-center text-xs leading-6 text-muted">
                        正在生成微信扫码二维码…
                      </div>
                    )}
                    {wechatQrState === "error" && (
                      <div className="px-4 text-center text-xs leading-6 text-muted">
                        暂时没能渲染二维码。你可以先用「微信登录」直接跳到微信授权页。
                      </div>
                    )}
                  </div>
                  {wechatQrUrl && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        className="theme-button-muted inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs transition"
                        type="button"
                        onClick={() => void prepareWeChatQr()}
                      >
                        <RefreshCcw size={13} strokeWidth={1.8} />
                        刷新二维码
                      </button>
                      <a
                        className="theme-button-muted inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs transition"
                        href={wechatQrUrl}
                      >
                        <MessageCircleMore size={13} strokeWidth={1.8} />
                        打开微信授权页
                      </a>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {message && (
        <div className="theme-card-soft mt-4 rounded-[18px] px-3.5 py-2.5 text-sm leading-6 text-muted">
          {message}
        </div>
      )}
    </section>
  );
}

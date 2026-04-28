import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Cloud, LogOut, Mail, ShieldCheck } from "lucide-react";
import type { Session } from "@supabase/supabase-js";
import { authRepository } from "../services/authRepository";

interface AccountMenuProps {
  align?: "left" | "right";
  compact?: boolean;
  onOpenData: () => void;
}

export function AccountMenu({
  align = "left",
  compact = false,
  onOpenData,
}: AccountMenuProps) {
  const [open, setOpen] = useState(false);
  const [configured, setConfigured] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [mounted, setMounted] = useState(false);
  const [menuPosition, setMenuPosition] = useState({
    left: 16,
    maxHeight: 520,
    top: 88,
    width: 336,
  });
  const panelRef = useRef<HTMLDivElement | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

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
      if (nextSession) {
        setMessage("登录成功，接下来可以去同步你的云端数据。");
      }
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!open) return undefined;

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (
        !rootRef.current?.contains(target) &&
        !panelRef.current?.contains(target)
      ) {
        setOpen(false);
      }
    }

    window.addEventListener("mousedown", handlePointerDown);
    return () => window.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  useLayoutEffect(() => {
    if (!open) return undefined;

    function updatePosition() {
      const trigger = rootRef.current;
      if (!trigger) return;

      const rect = trigger.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const desiredWidth = compact ? 320 : 336;
      const width = Math.max(280, Math.min(desiredWidth, viewportWidth - 32));
      const preferredLeft = align === "right" ? rect.right - width : rect.left;
      const left = Math.min(Math.max(16, preferredLeft), viewportWidth - width - 16);
      const top = Math.min(rect.bottom + 12, viewportHeight - 120);
      const maxHeight = Math.max(260, viewportHeight - top - 16);

      setMenuPosition({
        left,
        maxHeight,
        top,
        width,
      });
    }

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [align, compact, open]);

  const initials = useMemo(() => {
    const seed = session?.user.email?.trim().charAt(0) ?? "Q";
    return seed.toUpperCase();
  }, [session?.user.email]);

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

  async function signOut() {
    setBusy(true);
    setMessage("");
    try {
      await authRepository.signOut();
      setMessage("已退出当前账号。");
      setOpen(false);
    } catch {
      setMessage("退出时遇到问题，请稍后再试。");
    } finally {
      setBusy(false);
    }
  }

  const menu =
    open && mounted
      ? createPortal(
          <div
            ref={panelRef}
            className="frost-panel-strong fixed z-[80] overflow-y-auto rounded-[26px] p-4 shadow-[0_24px_70px_rgba(20,20,20,0.14)] subtle-scrollbar"
            style={{
              left: menuPosition.left,
              maxHeight: menuPosition.maxHeight,
              top: menuPosition.top,
              width: menuPosition.width,
            }}
          >
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink">
              <ShieldCheck size={16} strokeWidth={1.8} />
              账号与同步
            </div>

            {session ? (
              <div>
                <div className="rounded-[18px] bg-sage/10 px-3.5 py-3 text-sm leading-6 text-ink">
                  当前账号：{session.user.email ?? "已登录用户"}
                </div>
                <p className="mt-3 text-sm leading-7 text-muted">
                  这台设备已经连上云端。去数据与隐私页可以继续同步、恢复和管理备份。
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    className="theme-primary-button inline-flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-medium transition"
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      onOpenData();
                    }}
                  >
                    <Cloud size={15} strokeWidth={1.8} />
                    去管理同步
                  </button>
                  <button
                    className="theme-surface-soft inline-flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm text-ink transition hover:bg-white"
                    disabled={busy}
                    type="button"
                    onClick={() => void signOut()}
                  >
                    <LogOut size={15} strokeWidth={1.8} />
                    退出登录
                  </button>
                </div>
              </div>
            ) : configured ? (
              <div>
                <p className="mb-3 text-sm leading-7 text-muted">
                  邮箱登录已经移到这里了。输入邮箱后，QuantumX 会给你发一封登录链接。
                </p>
                <div className="flex gap-2">
                  <label className="relative min-w-0 flex-1">
                    <Mail
                      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
                      size={15}
                      strokeWidth={1.8}
                    />
                    <input
                      className="theme-surface-input w-full rounded-[18px] border border-transparent py-2.5 pl-9 pr-3 text-sm text-ink outline-none transition focus:border-white focus:bg-white"
                      placeholder="邮箱地址"
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                    />
                  </label>
                  <button
                    className="theme-primary-button rounded-xl px-3.5 py-2.5 text-sm font-medium transition"
                    disabled={busy || email.trim().length === 0}
                    type="button"
                    onClick={() => void sendMagicLink()}
                  >
                    发送链接
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <p className="text-sm leading-7 text-muted">
                  当前部署还没有连好云端登录。等 Supabase 环境变量配置完成后，这里就能直接发邮箱登录链接。
                </p>
                <button
                  className="theme-surface-soft mt-4 inline-flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm text-ink transition hover:bg-white"
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    onOpenData();
                  }}
                >
                  去数据与隐私查看状态
                </button>
              </div>
            )}

            {message && (
              <div className="theme-surface-soft mt-4 rounded-[18px] px-3.5 py-2.5 text-sm leading-6 text-muted">
                {message}
              </div>
            )}
          </div>,
          document.body,
        )
      : null;

  return (
    <div className="relative" ref={rootRef}>
      <button
        className={`theme-surface-ghost inline-flex items-center rounded-2xl text-left transition hover:bg-white hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-sage/45 ${
          compact ? "gap-0 p-2" : "gap-2 px-2.5 py-2"
        }`}
        type="button"
        onClick={() => setOpen((current) => !current)}
      >
        <div className="theme-brand-mark flex h-9 w-9 items-center justify-center rounded-2xl text-sm font-semibold">
          {initials}
        </div>
        {!compact && (
          <>
            <div className="min-w-0">
              <div className="max-w-[96px] truncate text-[13px] font-medium text-ink">
                {session?.user.email ?? "邮箱登录"}
              </div>
              <div className="text-[11px] text-muted">
                {session ? "云端已连接" : configured ? "未登录" : "未配置"}
              </div>
            </div>
            <ChevronDown
              className={`text-muted transition ${open ? "rotate-180" : ""}`}
              size={15}
              strokeWidth={1.8}
            />
          </>
        )}
      </button>

      {menu}
    </div>
  );
}

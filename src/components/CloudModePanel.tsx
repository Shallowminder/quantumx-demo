import { useEffect, useState } from "react";
import { CheckCircle2, Cloud, LogOut, Mail, ShieldCheck } from "lucide-react";
import type { Session } from "@supabase/supabase-js";
import { authRepository } from "../services/authRepository";

export function CloudModePanel() {
  const [configured, setConfigured] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

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
            账号会话已准备好。下一步会把本地记录迁移到云端数据库。
          </p>
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

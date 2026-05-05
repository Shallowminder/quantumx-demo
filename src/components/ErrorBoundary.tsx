import { Component, type ErrorInfo, type ReactNode } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = {
    hasError: false,
  };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(error, errorInfo);
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <main className="flex min-h-screen items-center justify-center bg-canvas px-5 py-10 text-ink">
        <section className="frost-panel-strong w-full max-w-md rounded-[28px] p-6 shadow-[0_24px_70px_rgb(var(--shadow-rgb)_/_0.12)]">
          <div className="mb-2 text-lg font-semibold text-ink">
            页面遇到了一点问题
          </div>
          <p className="text-sm leading-7 text-muted">
            当前浏览器里的数据通常仍保存在本地。你可以刷新页面，或前往数据与隐私页下载备份。
          </p>
          <button
            className="theme-primary-button mt-5 rounded-xl px-4 py-2.5 text-sm font-medium transition"
            type="button"
            onClick={() => window.location.reload()}
          >
            刷新页面
          </button>
        </section>
      </main>
    );
  }
}

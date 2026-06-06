import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[RE:Fashioned] Uncaught render error:", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div
          className="min-h-screen flex flex-col items-center justify-center px-6 text-center select-none"
          style={{ background: "hsl(152 53% 8%)" }}
        >
          {/* Logo mark */}
          <div className="mb-8 flex flex-col items-center gap-3">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg"
              style={{ background: "linear-gradient(135deg,#6AE096 0%,#3dcc72 100%)" }}
            >
              <svg className="w-8 h-8" style={{ color: "#0d2a1f" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <rect x="3" y="3" width="7" height="7" rx="1" />
                <rect x="14" y="3" width="7" height="7" rx="1" />
                <rect x="3" y="14" width="7" height="7" rx="1" />
                <rect x="14" y="14" width="7" height="7" rx="1" />
              </svg>
            </div>
            <span className="font-bold text-lg tracking-tight text-white">RE:Fashioned</span>
          </div>

          {/* Error icon */}
          <div className="mb-5 flex items-center justify-center w-16 h-16 rounded-full border border-red-500/30 bg-red-500/10">
            <svg
              className="w-8 h-8 text-red-400"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
              />
            </svg>
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-3">Something went wrong</h1>
          <p className="text-white/50 text-sm max-w-sm leading-relaxed mb-8">
            An unexpected error occurred. You can reload the page to try again, or return to the dashboard.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-3">
            <button
              onClick={() => window.location.reload()}
              className="flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold transition-all duration-200 shadow-lg hover:shadow-[0_0_24px_hsl(145_65%_50%/0.35)] focus:outline-none focus:ring-2 focus:ring-[#6AE096]/40"
              style={{ background: "linear-gradient(135deg,#6AE096 0%,#3dcc72 100%)", color: "#0d2a1f" }}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Reload Page
            </button>
            <a
              href="/dashboard"
              className="text-sm text-white/40 hover:text-white/70 transition-colors underline underline-offset-2"
            >
              Return to Dashboard
            </a>
          </div>

          <p className="mt-12 text-xs text-white/20">RE:Fashioned · Sustainability Intelligence Platform</p>
        </div>
      );
    }

    return this.props.children;
  }
}

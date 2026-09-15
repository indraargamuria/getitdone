import type { ReactNode } from "react";
import { Component } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidCatch(error: Error, info: { componentStack?: string }) {
    // Log to console for debugging — Sentry or another remote service can be
    // wired here later if/when this is a multi-user deployment.
    console.error("[ErrorBoundary] Unhandled render error:", error, info.componentStack);
  }

  reset = () => {
    this.setState({ error: null });
  };

  override render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-paper text-ink">
          <div className="max-w-md w-full rounded-2xl border border-rule-strong p-8 text-center">
            <div className="font-display text-2xl mb-3">Something went wrong</div>
            <p className="text-inkdim mb-6">
              The app hit an unexpected error. Your data is safe on the server.
            </p>
            <button
              type="button"
              onClick={this.reset}
              className="inline-flex items-center justify-center rounded-lg bg-accent px-5 py-2.5 text-white font-medium hover:bg-accent-strong transition-colors"
            >
              Try again
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

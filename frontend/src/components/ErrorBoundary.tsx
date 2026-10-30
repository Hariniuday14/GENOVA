import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("GENOVA UI error", error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-screen items-center justify-center px-6">
          <div className="panel max-w-lg p-6">
            <p className="eyebrow">Unexpected error</p>
            <h1 className="mt-2 text-lg font-semibold text-ink">
              The interface could not render
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-ink-muted">
              {this.state.error.message}
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-5 rounded-lg bg-accent-cyan px-4 py-2 text-sm font-medium text-midnight-950"
            >
              Reload application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

import { AlertTriangle } from "lucide-react";
import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  /** Custom fallback UI - overrides the default error card */
  fallback?: ReactNode;
  /** Short label shown in the default error card */
  label?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Class-based error boundary.  Catches uncaught render/lifecycle errors in
 * its subtree and shows a recoverable fallback instead of crashing the whole page.
 *
 * Usage:
 *   <ErrorBoundary label="Transport panel failed to load">
 *     <RiskyComponent />
 *   </ErrorBoundary>
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary] Uncaught error:", error, info.componentStack);
  }

  private reset = () => this.setState({ hasError: false, error: null });

  render() {
    if (!this.state.hasError) return this.props.children;

    if (this.props.fallback) return this.props.fallback;

    return (
      <div
        className="flex flex-col items-center justify-center p-10 text-center min-h-[200px] bg-gray-900 rounded-2xl border border-gray-800"
        role="alert"
      >
        <AlertTriangle
          className="w-10 h-10 text-red-500 mb-3"
          aria-hidden="true"
        />
        <p className="text-white font-semibold mb-1 text-base">
          {this.props.label ?? "Something went wrong"}
        </p>
        {this.state.error?.message && (
          <p className="text-gray-400 text-sm mb-4 max-w-xs">
            {this.state.error.message}
          </p>
        )}
        <button
          onClick={this.reset}
          className="px-4 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-gray-300 text-sm transition-colors"
        >
          Try again
        </button>
      </div>
    );
  }
}

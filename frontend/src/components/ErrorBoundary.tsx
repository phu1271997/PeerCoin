import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('PeerCoin ErrorBoundary caught:', error, info);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100 p-6">
          <div className="max-w-lg w-full p-8 rounded-3xl bg-slate-900 border border-rose-500/30 shadow-2xl space-y-5">
            <div className="flex items-center space-x-3">
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-rose-400">
                  Something went wrong
                </div>
                <h2 className="text-xl font-bold text-slate-100">PeerCoin frontend crashed</h2>
              </div>
            </div>

            <p className="text-sm text-slate-300 leading-relaxed">
              The React tree hit an unrecoverable error. Your on-chain state on GenLayer studionet is unaffected — this is a UI-only issue. Full trace below.
            </p>

            {this.state.error && (
              <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs text-rose-300 font-mono overflow-auto max-h-48 whitespace-pre-wrap">
                {this.state.error.name}: {this.state.error.message}
                {this.state.error.stack ? '\n\n' + this.state.error.stack : ''}
              </pre>
            )}

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={this.handleReset}
                className="flex-1 flex items-center justify-center space-x-2 px-5 py-3 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 text-slate-950 font-bold text-sm hover:opacity-90 transition"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Reload App</span>
              </button>
              <a
                href="https://github.com/phu1271997/PeerCoin/issues"
                target="_blank"
                rel="noreferrer"
                className="flex-1 flex items-center justify-center px-5 py-3 rounded-xl bg-slate-800 text-slate-200 font-semibold text-sm hover:bg-slate-700 transition"
              >
                Report on GitHub
              </a>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

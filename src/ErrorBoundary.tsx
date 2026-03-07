import { Component, type ErrorInfo, type ReactNode } from 'react';
import { trackError } from './game/telemetry';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Keep a console trail for production triage.
    console.error('Fatal UI error', error, info);
    trackError(error, { source: 'react_error_boundary', componentStack: info.componentStack });
  }

  private handleReload = (): void => {
    window.location.reload();
  };

  render(): ReactNode {
    if (!this.state.hasError) return this.props.children;

    return (
      <div
        style={{
          width: '100vw',
          height: '100vh',
          background: '#050510',
          color: '#f4f4ff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'monospace',
        }}
      >
        <div style={{ textAlign: 'center', maxWidth: 520, padding: 24 }}>
          <h1 style={{ fontSize: 24, marginBottom: 12 }}>Game Crashed</h1>
          <p style={{ opacity: 0.85, marginBottom: 18 }}>
            A fatal runtime error occurred. Reload to continue.
          </p>
          <button
            onClick={this.handleReload}
            style={{
              border: '1px solid #88bbff',
              background: '#152037',
              color: '#dbe8ff',
              padding: '10px 18px',
              borderRadius: 8,
              cursor: 'pointer',
            }}
          >
            Reload
          </button>
        </div>
      </div>
    );
  }
}

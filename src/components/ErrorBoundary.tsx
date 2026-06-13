import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center" style={{ background: '#f5f4ed' }}>
          <div className="text-center max-w-md px-6">
            <i className="bi bi-exclamation-triangle" style={{ fontSize: "40px", color: "#c96442" }} />
            <h1 className="text-xl font-bold mb-2" style={{ color: '#141413' }}>页面出错了</h1>
            <p className="text-sm mb-6" style={{ color: '#5e5d59' }}>
              {this.state.error?.message || '发生了未知错误'}
            </p>
            <button
              onClick={() => {
                this.setState({ hasError: false });
                window.location.href = '/';
              }}
              className="px-5 py-2 rounded-lg text-sm font-medium text-white"
              style={{ background: '#c96442' }}
            >
              返回首页
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

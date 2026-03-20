import { Component, type ErrorInfo, type ReactNode } from 'react';

class CanvasErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('3D Canvas error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex-1 flex items-center justify-center bg-slate-900 text-slate-400">
          <div className="text-center px-8">
            <div className="text-4xl mb-3">⚠</div>
            <p className="text-sm font-medium mb-1">Card preview unavailable</p>
            <p className="text-xs text-slate-500">
              Your browser may not support WebGL.{' '}
              <button
                onClick={() => this.setState({ hasError: false })}
                className="underline text-sky-400 hover:text-sky-300"
              >
                Try again
              </button>
            </p>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default CanvasErrorBoundary;

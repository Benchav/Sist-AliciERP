import { Component, type ErrorInfo, type ReactNode } from 'react';

interface AppErrorBoundaryProps {
  children: ReactNode;
}

interface AppErrorBoundaryState {
  hasError: boolean;
  message?: string;
}

export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  public state: AppErrorBoundaryState = {
    hasError: false,
  };

  static getDerivedStateFromError(error: unknown): AppErrorBoundaryState {
    return {
      hasError: true,
      message: error instanceof Error ? error.message : 'Algo salió mal',
    };
  }

  componentDidCatch(error: unknown, errorInfo: ErrorInfo) {
    console.error('Error no controlado en la aplicación', error, errorInfo);
  }

  private handleReload = () => {
    this.setState({ hasError: false, message: undefined });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50 p-6 text-center text-slate-700">
          <div className="h-16 w-16 rounded-full border-4 border-red-200 border-t-red-500 animate-spin" />
          <div className="max-w-md space-y-2">
            <h1 className="text-2xl font-semibold text-slate-900">Se produjo un error</h1>
            <p className="text-sm text-slate-500">
              {this.state.message ?? 'Recarga la página para intentarlo nuevamente.'}
            </p>
          </div>
          <button
            type="button"
            onClick={this.handleReload}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-indigo-700"
          >
            Recargar aplicación
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

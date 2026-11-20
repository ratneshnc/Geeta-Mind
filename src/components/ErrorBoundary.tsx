import { Component, type ErrorInfo, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error?.message || 'An unexpected rendering error occurred.',
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[GitaMind UI ErrorBoundary]:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#FAF8F5] dark:bg-[#12151A] px-6 py-12">
          <div className="max-w-md w-full rounded-xl bg-white dark:bg-[#1A1E25] border border-[#E8E4DC] dark:border-[#292F3A] p-6 space-y-4">
            <p className="text-xs font-medium text-[#C85A32] dark:text-[#E6B85C]">
              GitaMind Recovery
            </p>
            <h1 className="font-serif text-xl font-semibold text-[#1F2421] dark:text-[#F2EFE9]">
              Something interrupted your reflection
            </h1>
            <p className="text-sm leading-relaxed text-[#5C6460] dark:text-[#9CA3AF]">
              {this.state.errorMessage}
            </p>
            <button
              type="button"
              onClick={() => {
                this.setState({ hasError: false, errorMessage: '' });
                window.location.reload();
              }}
              className="px-4 py-2 rounded-lg bg-[#C85A32] hover:bg-[#B24C27] text-white dark:bg-[#E6B85C] dark:text-[#12151A] text-xs font-semibold transition-colors cursor-pointer"
            >
              Reload Sanctuary
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

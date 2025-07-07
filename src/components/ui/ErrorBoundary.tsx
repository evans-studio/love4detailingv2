'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from './button';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error to an error reporting service
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback error={this.state.error} />;
    }

    return this.props.children;
  }
}

interface ErrorFallbackProps {
  error: Error | null;
}

function ErrorFallback({ error }: ErrorFallbackProps) {
  const router = useRouter();

  return (
    <div className="min-h-[400px] flex items-center justify-center p-6 bg-[#141414]">
      <div className="text-center">
        <h2 className="text-2xl font-semibold text-[#F2F2F2] mb-4">
          Oops! Something went wrong
        </h2>
        <p className="text-[#C7C7C7] mb-6 max-w-md">
          {error?.message || 'An unexpected error occurred. Please try again later.'}
        </p>
        <div className="space-x-4">
          <Button
            onClick={() => router.refresh()}
            variant="outline"
          >
            Try Again
          </Button>
          <Button
            onClick={() => router.push('/')}
          >
            Go Home
          </Button>
        </div>
      </div>
    </div>
  );
}

// HOC to wrap components with ErrorBoundary
export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>
) {
  return function WithErrorBoundary(props: P) {
    return (
      <ErrorBoundary>
        <WrappedComponent {...props} />
      </ErrorBoundary>
    );
  };
}
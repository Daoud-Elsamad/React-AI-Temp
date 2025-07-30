import React, { Component, ErrorInfo, ReactNode } from 'react';
import { errorTracker, ErrorSeverity } from '../../lib/monitoring/errorTracking';

// Error boundary props
interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  resetOnPropsChange?: boolean;
  resetKeys?: Array<string | number>;
  isolate?: boolean;
  level?: 'page' | 'component' | 'critical';
}

// Error boundary state
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string | null;
  retryCount: number;
}

// Main error boundary component
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private resetTimeoutId: number | null = null;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
      retryCount: 0
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
      errorId: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const { onError, level = 'component' } = this.props;

    // Store error info in state
    this.setState({ errorInfo });

    // Call custom error handler if provided
    if (onError) {
      onError(error, errorInfo);
    }

    // Track error with enhanced context
    errorTracker.captureError(error, {
      component: errorInfo.componentStack || undefined,
      extra: {
        level,
        errorBoundary: true,
        retryCount: this.state.retryCount,
        componentStack: errorInfo.componentStack,
        errorInfo: errorInfo
      }
    });

    // Add breadcrumb for debugging
    errorTracker.addBreadcrumb(
      `Error boundary caught error: ${error.message}`,
      'error',
      {
        level,
        componentStack: errorInfo.componentStack
      }
    );

    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    const { resetKeys, resetOnPropsChange } = this.props;
    const { hasError } = this.state;

    // Reset error state if resetKeys changed
    if (hasError && resetKeys) {
      const prevResetKeys = prevProps.resetKeys || [];
      const hasResetKeyChanged = resetKeys.some(
        (key, index) => key !== prevResetKeys[index]
      );

      if (hasResetKeyChanged) {
        this.resetErrorBoundary();
      }
    }

    // Reset error state if props changed and resetOnPropsChange is true
    if (hasError && resetOnPropsChange && prevProps.children !== this.props.children) {
      this.resetErrorBoundary();
    }
  }

  resetErrorBoundary = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
      retryCount: this.state.retryCount + 1
    });

    // Clear any pending reset timeout
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
      this.resetTimeoutId = null;
    }
  };

  handleRetry = () => {
    const { retryCount } = this.state;
    
    // Limit retry attempts
    if (retryCount >= 3) {
          errorTracker.captureMessage(
      'Maximum retry attempts reached for error boundary',
      ErrorSeverity.WARNING,
      { 
        extra: { errorId: this.state.errorId, retryCount }
      }
      );
      return;
    }

    this.resetErrorBoundary();
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    const { hasError, error, errorInfo, retryCount } = this.state;
    const { children, fallback, level = 'component', isolate = false } = this.props;

    if (hasError && error) {
      // Custom fallback UI
      if (fallback) {
        return fallback;
      }

      // Default fallback UI based on level
      return (
        <ErrorFallback
          error={error}
          errorInfo={errorInfo}
          level={level}
          retryCount={retryCount}
          onRetry={this.handleRetry}
          onReload={this.handleReload}
          isolate={isolate}
        />
      );
    }

    return children;
  }
}

// Default error fallback component
interface ErrorFallbackProps {
  error: Error;
  errorInfo: ErrorInfo | null;
  level: 'page' | 'component' | 'critical';
  retryCount: number;
  onRetry: () => void;
  onReload: () => void;
  isolate: boolean;
}

const ErrorFallback: React.FC<ErrorFallbackProps> = ({
  error,
  errorInfo,
  level,
  retryCount,
  onRetry,
  onReload,
  isolate
}) => {
  const canRetry = retryCount < 3;
  const showDetails = process.env.NODE_ENV === 'development';

  const getErrorIcon = () => {
    switch (level) {
      case 'critical':
        return '💥';
      case 'page':
        return '⚠️';
      default:
        return '🐛';
    }
  };

  const getErrorTitle = () => {
    switch (level) {
      case 'critical':
        return 'Critical System Error';
      case 'page':
        return 'Page Error';
      default:
        return 'Component Error';
    }
  };

  const getErrorMessage = () => {
    switch (level) {
      case 'critical':
        return 'A critical error occurred that prevents the application from functioning properly.';
      case 'page':
        return 'An error occurred while loading this page.';
      default:
        return 'A component error occurred. This section may not display correctly.';
    }
  };

  const containerClass = isolate
    ? 'inline-block p-4 border border-red-200 bg-red-50 rounded-lg dark:border-red-800 dark:bg-red-900/20'
    : level === 'critical'
    ? 'min-h-screen flex items-center justify-center bg-red-50 dark:bg-red-900/20'
    : level === 'page'
    ? 'min-h-[400px] flex items-center justify-center'
    : 'p-6 bg-red-50 border border-red-200 rounded-lg dark:border-red-800 dark:bg-red-900/20';

  return (
    <div className={containerClass}>
      <div className="text-center max-w-md mx-auto">
        <div className="text-4xl mb-4">{getErrorIcon()}</div>
        
        <h2 className="text-xl font-bold text-red-800 dark:text-red-200 mb-2">
          {getErrorTitle()}
        </h2>
        
        <p className="text-red-700 dark:text-red-300 mb-6">
          {getErrorMessage()}
        </p>

        {showDetails && (
          <details className="mb-6 text-left">
            <summary className="cursor-pointer text-sm font-medium text-red-600 dark:text-red-400 mb-2">
              Error Details (Development)
            </summary>
            <div className="bg-red-100 dark:bg-red-900/40 p-3 rounded text-xs overflow-auto max-h-40">
              <div className="font-mono">
                <strong>Error:</strong> {error.message}
              </div>
              {error.stack && (
                <div className="mt-2 font-mono whitespace-pre-wrap">
                  <strong>Stack:</strong><br />
                  {error.stack}
                </div>
              )}
              {errorInfo?.componentStack && (
                <div className="mt-2 font-mono whitespace-pre-wrap">
                  <strong>Component Stack:</strong><br />
                  {errorInfo.componentStack}
                </div>
              )}
            </div>
          </details>
        )}

        <div className="flex gap-3 justify-center">
          {canRetry && (
            <button
              onClick={onRetry}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded font-medium transition-colors"
            >
              Try Again {retryCount > 0 && `(${retryCount}/3)`}
            </button>
          )}
          
          {(level === 'critical' || level === 'page') && (
            <button
              onClick={onReload}
              className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded font-medium transition-colors"
            >
              Reload Page
            </button>
          )}
        </div>

        {retryCount >= 3 && (
          <p className="text-sm text-red-600 dark:text-red-400 mt-4">
            Maximum retry attempts reached. Please reload the page or contact support.
          </p>
        )}
      </div>
    </div>
  );
};

// Higher-order component for wrapping components with error boundaries
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  return WrappedComponent;
}

// Hook for programmatic error boundary reset
export function useErrorHandler() {
  return {
    captureError: (error: Error, context?: any) => {
      errorTracker.captureError(error, context);
    },
    resetErrorBoundary: () => {
      // This would need to be implemented with a context provider
      // For now, we'll just capture the intent
      console.log('Error boundary reset requested');
    }
  };
} 
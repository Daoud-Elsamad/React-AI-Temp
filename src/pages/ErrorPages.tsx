import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { errorTracker, ErrorSeverity } from '../lib/monitoring/errorTracking';

// Base error page component
interface BaseErrorPageProps {
  title: string;
  message: string;
  description?: string;
  icon: string;
  showHomeButton?: boolean;
  showBackButton?: boolean;
  showReloadButton?: boolean;
  children?: React.ReactNode;
}

const BaseErrorPage: React.FC<BaseErrorPageProps> = ({
  title,
  message,
  description,
  icon,
  showHomeButton = true,
  showBackButton = true,
  showReloadButton = false,
  children
}) => {
  const navigate = useNavigate();

  const handleGoBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  const handleReload = () => {
    window.location.reload();
  };

  React.useEffect(() => {
    // Track error page view
    errorTracker.addBreadcrumb(`Error page viewed: ${title}`, 'navigation');
  }, [title]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center px-4">
      <div className="max-w-lg w-full text-center">
        {/* Error Icon */}
        <div className="text-8xl mb-6 animate-bounce">
          {icon}
        </div>

        {/* Error Title */}
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
          {title}
        </h1>

        {/* Error Message */}
        <p className="text-xl text-gray-600 dark:text-gray-300 mb-2">
          {message}
        </p>

        {/* Error Description */}
        {description && (
          <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-md mx-auto">
            {description}
          </p>
        )}

        {/* Custom Children */}
        {children}

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3 justify-center mt-8">
          {showHomeButton && (
            <Link
              to="/"
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors inline-flex items-center gap-2"
            >
              <span>🏠</span>
              Go Home
            </Link>
          )}

          {showBackButton && (
            <button
              onClick={handleGoBack}
              className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors inline-flex items-center gap-2"
            >
              <span>⬅️</span>
              Go Back
            </button>
          )}

          {showReloadButton && (
            <button
              onClick={handleReload}
              className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors inline-flex items-center gap-2"
            >
              <span>🔄</span>
              Reload Page
            </button>
          )}
        </div>

        {/* Help Text */}
        <div className="mt-12 text-sm text-gray-400 dark:text-gray-500">
          <p>Still having trouble? <Link to="/contact" className="text-blue-500 hover:text-blue-600">Contact Support</Link></p>
        </div>
      </div>
    </div>
  );
};

// 404 Not Found Page
export const NotFoundPage: React.FC = () => {
  React.useEffect(() => {
    errorTracker.captureMessage(
      `404 Page Not Found: ${window.location.pathname}`,
      ErrorSeverity.INFO,
      { url: window.location.href }
    );
  }, []);

  return (
    <BaseErrorPage
      title="404"
      message="Page Not Found"
      description="The page you're looking for doesn't exist or has been moved."
      icon="🔍"
    >
      <div className="mb-6">
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Looking for something specific? Try these popular pages:
        </p>
        <div className="flex flex-wrap gap-2 justify-center">
          <Link to="/dashboard" className="text-blue-500 hover:text-blue-600 text-sm underline">Dashboard</Link>
          <Link to="/ai" className="text-blue-500 hover:text-blue-600 text-sm underline">AI Chat</Link>
          <Link to="/files" className="text-blue-500 hover:text-blue-600 text-sm underline">File Manager</Link>
          <Link to="/about" className="text-blue-500 hover:text-blue-600 text-sm underline">About</Link>
        </div>
      </div>
    </BaseErrorPage>
  );
};

// 500 Server Error Page
export const ServerErrorPage: React.FC = () => {
  React.useEffect(() => {
    errorTracker.captureMessage(
      'Server Error Page Displayed',
      ErrorSeverity.ERROR,
      { url: window.location.href }
    );
  }, []);

  return (
    <BaseErrorPage
      title="500"
      message="Server Error"
      description="Something went wrong on our end. Our team has been notified and is working on a fix."
      icon="⚠️"
      showReloadButton
    >
      <div className="mb-6">
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 text-sm">
          <p className="text-yellow-800 dark:text-yellow-200">
            <strong>What can you do?</strong>
          </p>
          <ul className="mt-2 text-yellow-700 dark:text-yellow-300 text-left">
            <li>• Try refreshing the page</li>
            <li>• Wait a few minutes and try again</li>
            <li>• Check our status page for updates</li>
          </ul>
        </div>
      </div>
    </BaseErrorPage>
  );
};

// Network Error Page
export const NetworkErrorPage: React.FC = () => {
  const [isOnline, setIsOnline] = React.useState(navigator.onLine);

  React.useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    errorTracker.captureMessage(
      'Network Error Page Displayed',
      ErrorSeverity.WARNING,
      { 
        url: window.location.href,
        extra: { isOnline: navigator.onLine }
      }
    );

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <BaseErrorPage
      title="Connection Error"
      message="Network Problem"
      description="Unable to connect to the server. Please check your internet connection."
      icon="📡"
      showReloadButton
    >
      <div className="mb-6">
        <div className={`border rounded-lg p-4 text-sm ${
          isOnline 
            ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
            : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
        }`}>
          <p className={isOnline ? 'text-green-800 dark:text-green-200' : 'text-red-800 dark:text-red-200'}>
            <strong>Connection Status:</strong> {isOnline ? '🟢 Online' : '🔴 Offline'}
          </p>
          <p className={`mt-2 ${isOnline ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
            {isOnline 
              ? 'Your internet connection is working. The server might be temporarily unavailable.'
              : 'You appear to be offline. Please check your internet connection.'
            }
          </p>
        </div>
      </div>
    </BaseErrorPage>
  );
};

// Permission Denied Page
export const PermissionDeniedPage: React.FC = () => {
  React.useEffect(() => {
    errorTracker.captureMessage(
      'Permission Denied Page Displayed',
      ErrorSeverity.WARNING,
      { url: window.location.href }
    );
  }, []);

  return (
    <BaseErrorPage
      title="403"
      message="Access Denied"
      description="You don't have permission to access this resource."
      icon="🔒"
      showBackButton={false}
    >
      <div className="mb-6">
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 text-sm">
          <p className="text-blue-800 dark:text-blue-200">
            <strong>Need access?</strong>
          </p>
          <ul className="mt-2 text-blue-700 dark:text-blue-300 text-left">
            <li>• Make sure you're logged in</li>
            <li>• Contact your administrator</li>
            <li>• Check if your account has the required permissions</li>
          </ul>
        </div>
      </div>
    </BaseErrorPage>
  );
};

// Maintenance Page
export const MaintenancePage: React.FC = () => {
  React.useEffect(() => {
    errorTracker.captureMessage(
      'Maintenance Page Displayed',
      ErrorSeverity.INFO,
      { url: window.location.href }
    );
  }, []);

  return (
    <BaseErrorPage
      title="🔧"
      message="Under Maintenance"
      description="We're currently performing scheduled maintenance. We'll be back shortly!"
      icon="🚧"
      showBackButton={false}
      showReloadButton
    >
      <div className="mb-6">
        <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4 text-sm">
          <p className="text-orange-800 dark:text-orange-200">
            <strong>What's happening?</strong>
          </p>
          <p className="mt-2 text-orange-700 dark:text-orange-300">
            We're updating our systems to serve you better. This usually takes just a few minutes.
          </p>
        </div>
      </div>
    </BaseErrorPage>
  );
};

// Rate Limited Page
export const RateLimitedPage: React.FC = () => {
  const [timeLeft, setTimeLeft] = React.useState(60);

  React.useEffect(() => {
    errorTracker.captureMessage(
      'Rate Limited Page Displayed',
      ErrorSeverity.WARNING,
      { url: window.location.href }
    );

    const interval = setInterval(() => {
      setTimeLeft((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <BaseErrorPage
      title="429"
      message="Too Many Requests"
      description="You've made too many requests. Please wait before trying again."
      icon="⏰"
      showReloadButton={timeLeft === 0}
      showBackButton={false}
    >
      <div className="mb-6">
        <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4 text-sm">
          <p className="text-purple-800 dark:text-purple-200">
            <strong>Rate limit reached</strong>
          </p>
          <p className="mt-2 text-purple-700 dark:text-purple-300">
            {timeLeft > 0 
              ? `Please wait ${timeLeft} seconds before trying again.`
              : 'You can now try again!'
            }
          </p>
        </div>
      </div>
    </BaseErrorPage>
  );
};

// Generic Error Page
interface GenericErrorPageProps {
  error?: Error;
  title?: string;
  message?: string;
}

export const GenericErrorPage: React.FC<GenericErrorPageProps> = ({
  error,
  title = "Something went wrong",
  message = "An unexpected error occurred"
}) => {
  React.useEffect(() => {
    if (error) {
      errorTracker.captureError(error, {
        component: 'GenericErrorPage',
        url: window.location.href
      });
    }
  }, [error]);

  return (
    <BaseErrorPage
      title={title}
      message={message}
      description="We're sorry for the inconvenience. Please try again or contact support if the problem persists."
      icon="😕"
      showReloadButton
    >
      {process.env.NODE_ENV === 'development' && error && (
        <div className="mb-6">
          <details className="text-left bg-gray-100 dark:bg-gray-800 rounded-lg p-4">
            <summary className="cursor-pointer text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">
              Error Details (Development)
            </summary>
            <pre className="text-xs overflow-auto max-h-40 whitespace-pre-wrap text-gray-800 dark:text-gray-200">
              {error.stack || error.message}
            </pre>
          </details>
        </div>
      )}
    </BaseErrorPage>
  );
}; 
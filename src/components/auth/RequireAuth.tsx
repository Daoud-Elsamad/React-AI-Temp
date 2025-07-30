import { ComponentType, ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { LoadingSpinner } from '@/components/ui/Loading';

interface RequireAuthProps {
  children?: ReactNode;
  requiredRole?: string;
  requiredRoles?: string[];
  fallback?: ReactNode;
  fallbackComponent?: ComponentType;
  redirectTo?: string;
  showFallbackOnLoading?: boolean;
}

/**
 * Higher-order component for authentication and role-based access control
 */
export function RequireAuth({
  children,
  requiredRole,
  requiredRoles,
  fallback,
  fallbackComponent: FallbackComponent,
  redirectTo = '/login',
  showFallbackOnLoading = false,
}: RequireAuthProps) {
  const { user, isAuthenticated, isLoading } = useAuth();

  // Show loading while auth state is being determined
  if (isLoading) {
    if (showFallbackOnLoading && (fallback || FallbackComponent)) {
      return FallbackComponent ? <FallbackComponent /> : fallback;
    }
    return <LoadingSpinner text="Checking authentication..." />;
  }

  // Check authentication
  if (!isAuthenticated) {
    // Store the current location for redirect after login
    const currentPath = window.location.pathname;
    if (currentPath !== redirectTo) {
      localStorage.setItem('redirectAfterLogin', currentPath);
    }

    if (FallbackComponent) {
      return <FallbackComponent />;
    }

    if (fallback) {
      return <>{fallback}</>;
    }

    // Default unauthorized fallback
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900">
              <svg
                className="h-6 w-6 text-red-600 dark:text-red-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.314 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
            </div>
            <h2 className="mt-6 text-3xl font-extrabold text-gray-900 dark:text-white">
              Authentication Required
            </h2>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              You need to be logged in to access this page.
            </p>
            <div className="mt-4">
              <button
                onClick={() => (window.location.href = redirectTo)}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Sign In
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Check role-based access
  const hasRequiredRole = () => {
    if (!user) return false;
    
    if (requiredRole) {
      return user.role === requiredRole;
    }
    
    if (requiredRoles && requiredRoles.length > 0) {
      return requiredRoles.includes(user.role || '');
    }
    
    return true; // No role requirement
  };

  if (!hasRequiredRole()) {
    if (FallbackComponent) {
      return <FallbackComponent />;
    }

    if (fallback) {
      return <>{fallback}</>;
    }

    // Default access denied fallback
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100 dark:bg-yellow-900">
              <svg
                className="h-6 w-6 text-yellow-600 dark:text-yellow-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m0 0v2m0-2h2m-2 0H10m2-4V7m0 0V5m0 2h2m-2 0H10"
                />
              </svg>
            </div>
            <h2 className="mt-6 text-3xl font-extrabold text-gray-900 dark:text-white">
              Access Denied
            </h2>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              You don't have permission to access this page.
            </p>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Required role: {requiredRole || requiredRoles?.join(', ')}
            </p>
            <div className="mt-4">
              <button
                onClick={() => window.history.back()}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-gray-600 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
              >
                Go Back
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // User is authenticated and has required permissions
  return <>{children}</>;
}

/**
 * Higher-order component factory for creating protected components
 */
export function withAuth<P extends object>(
  Component: ComponentType<P>,
  options: Omit<RequireAuthProps, 'children'> = {}
) {
  const WrappedComponent = (props: P) => (
    <RequireAuth {...options}>
      <Component {...props} />
    </RequireAuth>
  );

  WrappedComponent.displayName = `withAuth(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
} 